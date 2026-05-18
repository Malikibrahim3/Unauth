#!/usr/bin/env ts-node
/**
 * scripts/test-data/generateUsBenchmarkV1.ts
 *
 * Generate the US benchmark v1 dataset for the Unauth engine.
 *
 *   test-data/us_benchmark_v1.csv                (15,000 rows, 2 merchants)
 *   test-data/us_benchmark_v1_ground_truth.json  (per-cohort/ring/cluster index)
 *
 * The dataset is deterministic — seeded PRNG, identical output each run.
 *
 * Cohorts (totals = 15,000):
 *   1. Serial INR claimers          600  / 80 ids
 *   2. Cross-merchant fraud rings   400  / 25 ids
 *   3. Return fraud / wardrobing    500  / 60 ids
 *   4. Chargeback specialists       300  / 35 ids
 *   5. First-order fraudsters       200  / 200 ids
 *   6. Legitimate customers       12,500 / ~2,000 ids   (padded from 11,500 to hit 15k)
 *   7. Legitimate with shared sig.  500  / 500 traps
 */

import fs from 'fs';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// SEEDED PRNG (mulberry32) — deterministic output
// ─────────────────────────────────────────────────────────────────────────────

let _seed = 0xc0ffee;
function setSeed(s: number) {
  _seed = s >>> 0;
}
function rand(): number {
  _seed = (_seed + 0x6D2B79F5) >>> 0;
  let t = _seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function pickN<T>(arr: readonly T[], n: number): T[] {
  const c = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && c.length; i++) {
    const idx = Math.floor(rand() * c.length);
    out.push(c.splice(idx, 1)[0]);
  }
  return out;
}
function weightedPick<T>(items: readonly { v: T; w: number }[]): T {
  const total = items.reduce((s, it) => s + it.w, 0);
  let r = rand() * total;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it.v;
  }
  return items[items.length - 1].v;
}
function chance(p: number): boolean {
  return rand() < p;
}
function shuffle<T>(arr: T[]): T[] {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}
function hex(len: number): string {
  const chars = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(rand() * 16)];
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// US POOLS
// ─────────────────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  // Common US first names — 300+
  'James','John','Robert','Michael','William','David','Richard','Joseph','Thomas','Charles',
  'Christopher','Daniel','Matthew','Anthony','Mark','Donald','Steven','Paul','Andrew','Joshua',
  'Kenneth','Kevin','Brian','George','Timothy','Ronald','Jason','Edward','Jeffrey','Ryan',
  'Jacob','Gary','Nicholas','Eric','Jonathan','Stephen','Larry','Justin','Scott','Brandon',
  'Benjamin','Samuel','Gregory','Frank','Alexander','Raymond','Patrick','Jack','Dennis','Jerry',
  'Tyler','Aaron','Jose','Adam','Henry','Nathan','Douglas','Zachary','Peter','Kyle',
  'Walter','Ethan','Jeremy','Harold','Keith','Christian','Roger','Noah','Gerald','Carl',
  'Terry','Sean','Austin','Arthur','Lawrence','Jesse','Dylan','Bryan','Joe','Jordan',
  'Billy','Bruce','Albert','Willie','Gabriel','Logan','Alan','Juan','Wayne','Roy',
  'Ralph','Randy','Eugene','Vincent','Russell','Elijah','Louis','Bobby','Philip','Johnny',
  'Mary','Patricia','Jennifer','Linda','Elizabeth','Barbara','Susan','Jessica','Sarah','Karen',
  'Lisa','Nancy','Betty','Sandra','Margaret','Ashley','Kimberly','Emily','Donna','Michelle',
  'Carol','Amanda','Melissa','Deborah','Stephanie','Dorothy','Rebecca','Sharon','Laura','Cynthia',
  'Amy','Kathleen','Angela','Shirley','Brenda','Emma','Anna','Pamela','Nicole','Samantha',
  'Katherine','Christine','Helen','Debra','Rachel','Carolyn','Janet','Maria','Catherine','Heather',
  'Diane','Olivia','Julie','Joyce','Victoria','Ruth','Virginia','Lauren','Kelly','Christina',
  'Joan','Evelyn','Judith','Andrea','Hannah','Megan','Cheryl','Jacqueline','Martha','Madison',
  'Teresa','Gloria','Sara','Janice','Ann','Kathryn','Abigail','Sophia','Frances','Jean',
  'Alice','Judy','Isabella','Julia','Grace','Amber','Denise','Danielle','Marilyn','Beverly',
  'Charlotte','Natalie','Theresa','Diana','Brittany','Doris','Kayla','Alexis','Lori','Marie',
  // More diverse: Hispanic, Asian, African-American, etc.
  'Carlos','Luis','Miguel','Diego','Hector','Ricardo','Rafael','Pedro','Jorge','Manuel',
  'Sergio','Fernando','Antonio','Eduardo','Roberto','Ramon','Salvador','Alberto','Pablo','Andres',
  'Sofia','Isabella','Camila','Valeria','Daniela','Mariana','Gabriela','Adriana','Veronica','Lucia',
  'Wei','Jin','Cheng','Hao','Bo','Lei','Chen','Lin','Wang','Liu',
  'Yuki','Hiro','Takeshi','Kenji','Aiko','Sakura','Yuna','Hana','Mei','Lin',
  'Aisha','Imani','Jamal','Tyrone','Marcus','Andre','DeShawn','Malik','Terrell','Darius',
  'Keisha','Tasha','Latoya','Tameka','Shanice','Aaliyah','Zaria','Nia','Maya','Jada',
  'Raj','Amit','Vikram','Arjun','Rohan','Karthik','Suresh','Sanjay','Vishal','Aryan',
  'Priya','Anjali','Divya','Kavya','Riya','Aanya','Ishita','Sneha','Pooja','Sara',
  'Sven','Lars','Erik','Magnus','Johan','Henrik','Niklas','Anders','Mats','Bjorn',
  'Liam','Mason','Lucas','Caleb','Owen','Eli','Wyatt','Carter','Hunter','Connor',
  'Aria','Chloe','Mila','Aubrey','Zoey','Lily','Ella','Avery','Riley','Layla',
  'Yusuf','Omar','Ahmed','Hassan','Ibrahim','Khalil','Tariq','Bilal','Karim','Hamza',
  'Fatima','Layla','Yasmin','Zara','Amina','Noor','Aaliyah','Hala','Salma','Rania',
];

const LAST_NAMES = [
  // Top US surnames — 400+
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
  'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
  'Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson',
  'Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
  'Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts',
  'Gomez','Phillips','Evans','Turner','Diaz','Parker','Cruz','Edwards','Collins','Reyes',
  'Stewart','Morris','Morales','Murphy','Cook','Rogers','Gutierrez','Ortiz','Morgan','Cooper',
  'Peterson','Bailey','Reed','Kelly','Howard','Ramos','Kim','Cox','Ward','Richardson',
  'Watson','Brooks','Chavez','Wood','James','Bennett','Gray','Mendoza','Ruiz','Hughes',
  'Price','Alvarez','Castillo','Sanders','Patel','Myers','Long','Ross','Foster','Jimenez',
  'Powell','Jenkins','Perry','Russell','Sullivan','Bell','Coleman','Butler','Henderson','Barnes',
  'Gonzales','Fisher','Vasquez','Simmons','Romero','Jordan','Patterson','Alexander','Hamilton','Graham',
  'Reynolds','Griffin','Wallace','Moreno','West','Cole','Hayes','Bryant','Herrera','Gibson',
  'Ellis','Tran','Medina','Aguilar','Stevens','Murray','Ford','Castro','Marshall','Owens',
  'Harrison','Fernandez','McDonald','Woods','Washington','Kennedy','Wells','Vargas','Henry','Chen',
  'Freeman','Webb','Tucker','Guzman','Burns','Crawford','Olson','Simpson','Porter','Hunter',
  'Gordon','Mendez','Silva','Shaw','Snyder','Mason','Dixon','Munoz','Hunt','Hicks',
  'Holmes','Palmer','Wagner','Black','Robertson','Boyd','Rose','Stone','Salazar','Fox',
  'Warren','Mills','Meyer','Rice','Schmidt','Garza','Daniels','Ferguson','Nichols','Stephens',
  'Soto','Weaver','Ryan','Gardner','Payne','Grant','Dunn','Kelley','Spencer','Hawkins',
  'Arnold','Pierce','Vazquez','Hansen','Peters','Santos','Hart','Bradley','Knight','Elliott',
  'Cunningham','Duncan','Armstrong','Hudson','Carroll','Lane','Riley','Andrews','Alvarado','Ray',
  'Delgado','Berry','Perkins','Hoffman','Johnston','Matthews','Pena','Richards','Contreras','Willis',
  'Carpenter','Lawrence','Sandoval','Guerrero','George','Chapman','Rios','Estrada','Ortega','Watkins',
  'Greene','Nunez','Wheeler','Valdez','Harper','Burke','Larson','Santiago','Maldonado','Morrison',
  'Franklin','Carlson','Austin','Dominguez','Carr','Lawson','Jacobs','OBrien','Lynch','Singh',
  'Vega','Bishop','Montgomery','Oliver','Jensen','Harvey','Williamson','Gilbert','Dean','Sims',
  'Espinoza','Howell','Li','Wong','Reid','Hanson','Le','McCoy','Garrett','Burton',
  'Fuller','Wang','Weber','Welch','Rojas','Lucas','Marquez','Fields','Park','Yang',
  'Little','Banks','Padilla','Day','Walsh','Bowman','Schultz','Luna','Fowler','Mejia',
  'Davidson','Acosta','Brewer','May','Holland','Juarez','Newman','Pearson','Curtis','Cortez',
  'Douglas','Schneider','Joseph','Barrett','Navarro','Figueroa','Keller','Avila','Wade','Molina',
  'Stanley','Hopkins','Campos','Barnett','Bates','Chambers','Caldwell','Beck','Lambert','Miranda',
  'Byrd','Craig','Ayala','Lowe','Frazier','Powers','Neal','Leonard','Gregory','Carrillo',
  'Sutton','Fleming','Rhodes','Shelton','Schwartz','Norris','Jennings','Watts','Duran','Walters',
  'Cohen','McDaniel','Moran','Parks','Steele','Vaughn','Becker','Holt','Deleon','Barker',
  'Terry','Hale','Leon','Hail','Benson','Haynes','Horton','Miles','Lyons','Pham',
  'Graves','Bush','Thornton','Wolfe','Warner','Cabrera','McKinney','Mann','Zimmerman','Dawson',
  'Lara','Fletcher','Page','McCarthy','Love','Robles','Cervantes','Solis','Erickson','Reeves',
  'Chang','Klein','Salinas','Fuentes','Baldwin','Daniel','Simon','Velasquez','Hardy','Higgins',
  'Aguirre','Lin','Cummings','Chandler','Sharp','Barber','Bowen','Ochoa','Dennis','Robbins',
];

// US cities with realistic ZIP samples + state codes
type City = { city: string; state: string; zips: string[]; ip_isp: string };
const CITIES: City[] = [
  // California 22%
  { city: 'Los Angeles', state: 'CA', zips: ['90001','90002','90003','90011','90015','90019','90024','90028','90034','90042','90046','90064','90066','90068','90210','90211','90212','90230','90245','90250','90272','90291','90402','91101','91201','91331','91401','91423','91604','91706'], ip_isp: 'spectrum' },
  { city: 'San Francisco', state: 'CA', zips: ['94102','94103','94107','94108','94109','94110','94114','94115','94117','94118','94121','94122','94123','94131','94133','94134','94158'], ip_isp: 'comcast' },
  { city: 'San Diego', state: 'CA', zips: ['92101','92102','92103','92104','92107','92109','92111','92113','92117','92122','92126','92128','92130','92154'], ip_isp: 'spectrum' },
  { city: 'San Jose', state: 'CA', zips: ['95110','95111','95112','95113','95116','95117','95118','95120','95121','95122','95124','95125','95126','95127','95128','95129','95131','95132','95133','95135','95136','95138','95139','95148'], ip_isp: 'att' },
  { city: 'Oakland', state: 'CA', zips: ['94601','94602','94605','94607','94609','94610','94611','94612','94618','94619'], ip_isp: 'att' },
  { city: 'Sacramento', state: 'CA', zips: ['95814','95815','95816','95818','95820','95821','95822','95823','95824','95825','95826','95828','95831','95832','95833','95834','95835','95838'], ip_isp: 'att' },
  // New York 14%
  { city: 'New York', state: 'NY', zips: ['10001','10002','10003','10004','10005','10009','10011','10012','10013','10014','10016','10017','10018','10019','10021','10022','10023','10024','10025','10026','10027','10028','10029','10031','10032','10034','10036','10037','10038','10128','10301','10314','11201','11206','11211','11215','11217','11220','11221','11222','11223','11225','11226','11229','11232','11234','11235','11237','11249','11354','11355','11368','11372','11373','11375','11377','11385','11432','11434','11691'], ip_isp: 'verizon' },
  { city: 'Buffalo', state: 'NY', zips: ['14201','14202','14203','14204','14206','14207','14208','14210','14211','14213','14214','14215','14216','14220','14222','14223','14225'], ip_isp: 'spectrum' },
  { city: 'Albany', state: 'NY', zips: ['12203','12204','12205','12206','12207','12208','12209','12210','12211'], ip_isp: 'spectrum' },
  { city: 'Rochester', state: 'NY', zips: ['14604','14606','14607','14608','14609','14610','14611','14612','14613','14614','14615','14616','14617','14618','14619','14620','14621','14623','14624','14625','14626'], ip_isp: 'spectrum' },
  // Texas 11%
  { city: 'Houston', state: 'TX', zips: ['77002','77004','77005','77006','77007','77008','77009','77011','77018','77019','77020','77024','77027','77030','77036','77041','77042','77043','77055','77056','77057','77063','77074','77077','77079','77084','77098','77584'], ip_isp: 'att' },
  { city: 'Dallas', state: 'TX', zips: ['75201','75202','75203','75204','75205','75206','75207','75208','75209','75210','75211','75212','75214','75215','75216','75217','75218','75219','75220','75221','75223','75224','75225','75227','75228','75229','75230','75231','75232','75233','75234','75235','75240','75243','75244','75246','75247','75248'], ip_isp: 'att' },
  { city: 'Austin', state: 'TX', zips: ['78701','78702','78703','78704','78705','78712','78717','78719','78721','78722','78723','78724','78725','78726','78727','78728','78729','78730','78731','78732','78733','78734','78735','78736','78737','78738','78739','78741','78744','78745','78746','78747','78748','78749','78750','78751','78752','78753','78754','78756','78757','78758','78759'], ip_isp: 'spectrum' },
  { city: 'San Antonio', state: 'TX', zips: ['78201','78202','78203','78204','78205','78207','78208','78209','78210','78211','78212','78213','78214','78215','78216','78217','78218','78219','78220','78221','78222','78223','78224','78225','78226','78227','78228','78229','78230','78231','78232','78233'], ip_isp: 'att' },
  // Florida 8%
  { city: 'Miami', state: 'FL', zips: ['33125','33126','33127','33128','33129','33130','33131','33132','33133','33134','33135','33136','33137','33138','33139','33140','33141','33142','33143','33144','33145','33146','33147','33150','33155','33156','33157','33158','33160','33161','33162','33165','33166','33167','33168','33169','33170','33172','33173','33174','33175','33176','33177','33178','33179','33180','33181','33182','33183','33184','33185','33186','33189','33193','33194','33196'], ip_isp: 'att' },
  { city: 'Orlando', state: 'FL', zips: ['32801','32803','32804','32805','32806','32807','32808','32809','32810','32811','32812','32814','32817','32818','32819','32820','32821','32822','32824','32825','32826','32827','32828','32829','32831','32832','32833','32835','32836','32837','32839'], ip_isp: 'spectrum' },
  { city: 'Tampa', state: 'FL', zips: ['33602','33603','33604','33605','33606','33607','33609','33610','33611','33612','33613','33614','33615','33616','33617','33618','33619','33620','33621','33624','33625','33626','33629','33647'], ip_isp: 'spectrum' },
  { city: 'Jacksonville', state: 'FL', zips: ['32202','32204','32205','32206','32207','32208','32209','32210','32211','32212','32216','32217','32218','32219','32220','32221','32222','32223','32224','32225','32226','32227'], ip_isp: 'comcast' },
  // Illinois 5%
  { city: 'Chicago', state: 'IL', zips: ['60601','60602','60603','60604','60605','60606','60607','60608','60609','60610','60611','60612','60613','60614','60615','60616','60617','60618','60619','60620','60621','60622','60623','60624','60625','60626','60628','60629','60630','60631','60632','60633','60634','60636','60637','60638','60639','60640','60641','60642','60643','60644','60645','60646','60647','60649','60651','60652','60653','60654','60655','60656','60657','60659','60660','60661'], ip_isp: 'comcast' },
  // Pennsylvania 4%
  { city: 'Philadelphia', state: 'PA', zips: ['19102','19103','19104','19106','19107','19111','19114','19115','19116','19118','19119','19120','19121','19122','19123','19124','19125','19126','19127','19128','19129','19130','19131','19132','19133','19134','19135','19136','19138','19139','19140','19141','19142','19143','19144','19145','19146','19147','19148','19149','19150','19151','19152','19153','19154'], ip_isp: 'verizon' },
  { city: 'Pittsburgh', state: 'PA', zips: ['15201','15203','15204','15205','15206','15207','15208','15210','15211','15212','15213','15214','15216','15217','15218','15219','15220','15221','15222','15224','15226','15227','15232','15233','15235','15236','15237','15239','15241','15243'], ip_isp: 'comcast' },
  // Ohio 4%
  { city: 'Columbus', state: 'OH', zips: ['43201','43202','43203','43204','43205','43206','43207','43209','43211','43212','43213','43214','43215','43217','43219','43220','43221','43223','43224','43227','43228','43229','43230','43231','43232','43235'], ip_isp: 'spectrum' },
  { city: 'Cleveland', state: 'OH', zips: ['44102','44103','44104','44105','44106','44108','44109','44110','44111','44112','44113','44114','44115','44118','44119','44120','44121','44125','44127','44128','44135','44144'], ip_isp: 'att' },
  { city: 'Cincinnati', state: 'OH', zips: ['45202','45203','45204','45205','45206','45207','45208','45209','45211','45212','45213','45214','45215','45216','45217','45219','45220','45223','45224','45225','45226','45227','45229','45230','45232','45237','45238','45239'], ip_isp: 'spectrum' },
  // Georgia 3%
  { city: 'Atlanta', state: 'GA', zips: ['30301','30303','30305','30306','30307','30308','30309','30310','30311','30312','30313','30314','30315','30316','30317','30318','30319','30324','30326','30327','30328','30329','30331','30332','30334','30336','30337','30339','30341','30342','30344','30345','30346','30349','30350','30354','30360','30363'], ip_isp: 'comcast' },
  // Washington 3%
  { city: 'Seattle', state: 'WA', zips: ['98101','98102','98103','98104','98105','98106','98107','98108','98109','98112','98115','98116','98117','98118','98119','98121','98122','98125','98126','98133','98134','98136','98144','98146','98154','98164','98174','98177','98178','98199'], ip_isp: 'comcast' },
  { city: 'Tacoma', state: 'WA', zips: ['98402','98403','98404','98405','98406','98407','98408','98409','98418','98421','98422','98444','98445','98465','98466','98498','98499'], ip_isp: 'comcast' },
  // Remaining 26% — distribute across other states
  { city: 'Boston', state: 'MA', zips: ['02108','02109','02110','02111','02113','02114','02115','02116','02118','02119','02120','02121','02122','02124','02125','02126','02127','02128','02129','02130','02131','02132','02134','02135','02136','02163','02199','02210','02215'], ip_isp: 'comcast' },
  { city: 'Phoenix', state: 'AZ', zips: ['85003','85004','85006','85007','85008','85009','85013','85014','85015','85016','85017','85018','85019','85020','85021','85022','85023','85024','85027','85028','85029','85031','85032','85033','85034','85035','85037','85040','85041','85042','85043','85044','85045','85048','85050','85051','85053','85054','85083','85085','85086','85087'], ip_isp: 'cox' },
  { city: 'Las Vegas', state: 'NV', zips: ['89101','89102','89103','89104','89106','89107','89108','89109','89110','89113','89115','89117','89118','89119','89120','89121','89122','89123','89128','89129','89130','89131','89134','89135','89139','89141','89142','89143','89144','89145','89146','89147','89148','89149','89156','89166','89169','89178','89179','89183'], ip_isp: 'cox' },
  { city: 'Denver', state: 'CO', zips: ['80202','80203','80204','80205','80206','80207','80209','80210','80211','80212','80214','80216','80218','80219','80220','80221','80222','80223','80224','80226','80227','80229','80230','80231','80232','80233','80234','80235','80236','80237','80238','80239','80246','80247','80249'], ip_isp: 'comcast' },
  { city: 'Detroit', state: 'MI', zips: ['48201','48202','48204','48205','48206','48207','48208','48209','48210','48211','48212','48213','48214','48215','48216','48217','48219','48221','48223','48224','48227','48228','48234','48235','48238','48239','48240'], ip_isp: 'att' },
  { city: 'Minneapolis', state: 'MN', zips: ['55401','55402','55403','55404','55405','55406','55407','55408','55409','55410','55411','55412','55413','55414','55415','55416','55417','55418','55419','55421','55422','55423','55425','55428','55430','55454','55455'], ip_isp: 'comcast' },
  { city: 'Portland', state: 'OR', zips: ['97201','97202','97203','97204','97205','97206','97209','97210','97211','97212','97213','97214','97215','97216','97217','97218','97219','97220','97221','97225','97227','97229','97230','97231','97232','97233','97236','97239','97266'], ip_isp: 'comcast' },
  { city: 'Charlotte', state: 'NC', zips: ['28202','28203','28204','28205','28206','28207','28208','28209','28210','28211','28212','28213','28214','28215','28216','28217','28226','28227','28262','28269','28270','28273','28277','28278','28280'], ip_isp: 'spectrum' },
  { city: 'Indianapolis', state: 'IN', zips: ['46201','46202','46203','46204','46205','46208','46214','46216','46217','46218','46219','46220','46221','46222','46224','46225','46226','46227','46228','46229','46231','46234','46235','46236','46237','46239','46240','46241','46250','46254','46256','46259','46260','46268','46278','46280','46290'], ip_isp: 'att' },
  { city: 'Nashville', state: 'TN', zips: ['37201','37203','37204','37205','37206','37207','37208','37209','37210','37211','37212','37213','37214','37215','37216','37217','37218','37219','37220','37221','37228'], ip_isp: 'comcast' },
  { city: 'Memphis', state: 'TN', zips: ['38103','38104','38105','38106','38107','38108','38109','38111','38112','38114','38115','38116','38117','38118','38119','38120','38122','38125','38126','38127','38128','38134','38138','38139','38141'], ip_isp: 'att' },
  { city: 'Louisville', state: 'KY', zips: ['40202','40203','40204','40205','40206','40207','40208','40209','40210','40211','40212','40213','40214','40215','40216','40217','40218','40219','40220','40222','40223','40228','40229','40242','40243','40258','40272','40291'], ip_isp: 'spectrum' },
  { city: 'Baltimore', state: 'MD', zips: ['21201','21202','21205','21206','21207','21208','21209','21210','21211','21212','21213','21214','21215','21216','21217','21218','21219','21220','21221','21222','21223','21224','21225','21226','21229','21230','21231','21234','21236','21237','21239','21251'], ip_isp: 'verizon' },
  { city: 'Milwaukee', state: 'WI', zips: ['53202','53203','53204','53205','53206','53207','53208','53209','53210','53211','53212','53213','53214','53215','53216','53217','53218','53219','53220','53221','53222','53223','53224','53225','53226','53227','53228','53233','53234'], ip_isp: 'spectrum' },
  { city: 'Albuquerque', state: 'NM', zips: ['87102','87104','87105','87106','87107','87108','87109','87110','87111','87112','87113','87114','87116','87120','87121','87122','87123','87124'], ip_isp: 'comcast' },
  { city: 'Tucson', state: 'AZ', zips: ['85701','85705','85706','85710','85711','85712','85713','85714','85715','85716','85718','85719','85730','85735','85736','85737','85741','85742','85745','85746','85747','85748','85749','85750','85756'], ip_isp: 'cox' },
  { city: 'Fresno', state: 'CA', zips: ['93701','93702','93703','93704','93705','93706','93710','93711','93720','93721','93722','93725','93726','93727','93728'], ip_isp: 'att' },
  { city: 'Mesa', state: 'AZ', zips: ['85201','85202','85203','85204','85205','85206','85207','85208','85209','85210','85212','85213','85215'], ip_isp: 'cox' },
  { city: 'Kansas City', state: 'MO', zips: ['64101','64102','64105','64106','64108','64109','64110','64111','64112','64113','64114','64116','64117','64118','64119','64120','64123','64124','64125','64126','64127','64128','64129','64130','64131','64132','64133','64134','64136','64137','64138','64139','64145','64146','64147','64149','64151','64152','64153','64154','64155','64156','64157','64158','64161','64164','64165','64166','64167','64168'], ip_isp: 'spectrum' },
  { city: 'Saint Louis', state: 'MO', zips: ['63101','63102','63103','63104','63106','63107','63108','63109','63110','63111','63112','63113','63115','63116','63118','63139','63147'], ip_isp: 'spectrum' },
  { city: 'Omaha', state: 'NE', zips: ['68102','68104','68105','68106','68107','68108','68111','68112','68114','68116','68117','68118','68122','68124','68127','68130','68131','68132','68134','68135','68137','68142','68144','68152','68154','68164','68198'], ip_isp: 'comcast' },
  { city: 'Raleigh', state: 'NC', zips: ['27601','27603','27604','27605','27606','27607','27608','27609','27610','27612','27613','27614','27615','27616','27617'], ip_isp: 'spectrum' },
  { city: 'New Orleans', state: 'LA', zips: ['70112','70113','70114','70115','70116','70117','70118','70119','70122','70124','70125','70126','70127','70128','70129','70130','70131'], ip_isp: 'att' },
  { city: 'Salt Lake City', state: 'UT', zips: ['84101','84102','84103','84104','84105','84106','84108','84109','84111','84112','84113','84115','84116','84117','84118','84119','84120','84121','84123','84124','84128'], ip_isp: 'comcast' },
];

const STREET_NAMES = [
  'Oak','Maple','Pine','Cedar','Elm','Birch','Spruce','Walnut','Cherry','Willow',
  'Magnolia','Sycamore','Poplar','Chestnut','Hickory','Ash','Aspen','Beech','Hawthorn','Juniper',
  'Main','Park','Lake','River','Hill','Sunset','Sunrise','Garden','Forest','Meadow',
  'Spring','Summer','Winter','Highland','Lowland','Valley','Ridge','Mountain','Brook','Creek',
  'Stone','Iron','Silver','Gold','Copper','Bronze','Steel','Granite','Marble','Slate',
  'Washington','Jefferson','Lincoln','Madison','Monroe','Jackson','Adams','Franklin','Hamilton','Roosevelt',
  'Church','School','Market','Mill','Bridge','Center','Court','Court','State','County',
  'College','University','Academy','Liberty','Independence','Freedom','Heritage','Pioneer','Patriot','Veterans',
  'Cypress','Holly','Dogwood','Redwood','Sequoia','Pinecone','Fern','Ivy','Rose','Lily',
  'Eagle','Hawk','Robin','Cardinal','Sparrow','Falcon','Heron','Owl','Crane','Phoenix',
];
const STREET_TYPES = ['St','Ave','Blvd','Dr','Rd','Ln','Way','Ct','Pl','Ter'];

const EMAIL_DOMAINS = [
  // 80%+ should be top 6
  { v: 'gmail.com', w: 48 }, { v: 'yahoo.com', w: 14 }, { v: 'outlook.com', w: 11 },
  { v: 'icloud.com', w: 8 }, { v: 'hotmail.com', w: 6 }, { v: 'aol.com', w: 3 },
  // Custom / ISP / work — distribute remaining
  { v: 'protonmail.com', w: 1 }, { v: 'fastmail.com', w: 0.4 }, { v: 'me.com', w: 0.5 },
  { v: 'live.com', w: 0.6 }, { v: 'msn.com', w: 0.3 }, { v: 'comcast.net', w: 0.6 },
  { v: 'verizon.net', w: 0.5 }, { v: 'att.net', w: 0.5 }, { v: 'sbcglobal.net', w: 0.4 },
  { v: 'cox.net', w: 0.3 }, { v: 'charter.net', w: 0.3 }, { v: 'bellsouth.net', w: 0.2 },
  { v: 'earthlink.net', w: 0.2 }, { v: 'optonline.net', w: 0.2 }, { v: 'rocketmail.com', w: 0.1 },
  { v: 'ymail.com', w: 0.2 }, { v: 'mail.com', w: 0.2 }, { v: 'gmx.com', w: 0.1 },
  { v: 'zoho.com', w: 0.2 }, { v: 'mac.com', w: 0.2 }, { v: 'inbox.com', w: 0.1 },
  // Work-style custom domains
  { v: 'apple.com', w: 0.1 }, { v: 'google.com', w: 0.1 }, { v: 'microsoft.com', w: 0.1 },
  { v: 'amazon.com', w: 0.1 }, { v: 'meta.com', w: 0.05 }, { v: 'netflix.com', w: 0.05 },
  { v: 'tesla.com', w: 0.05 }, { v: 'nike.com', w: 0.05 }, { v: 'starbucks.com', w: 0.05 },
  { v: 'wellsfargo.com', w: 0.05 }, { v: 'jpmorgan.com', w: 0.05 }, { v: 'chase.com', w: 0.05 },
  { v: 'citi.com', w: 0.05 }, { v: 'bankofamerica.com', w: 0.05 }, { v: 'ibm.com', w: 0.05 },
  { v: 'salesforce.com', w: 0.05 }, { v: 'oracle.com', w: 0.05 }, { v: 'cisco.com', w: 0.05 },
  { v: 'intel.com', w: 0.05 }, { v: 'dell.com', w: 0.05 }, { v: 'hp.com', w: 0.05 },
  { v: 'pwc.com', w: 0.05 }, { v: 'ey.com', w: 0.05 }, { v: 'kpmg.com', w: 0.05 },
  { v: 'deloitte.com', w: 0.05 }, { v: 'mckinsey.com', w: 0.05 }, { v: 'bcg.com', w: 0.05 },
  { v: 'bain.com', w: 0.05 }, { v: 'goldmansachs.com', w: 0.05 }, { v: 'morganstanley.com', w: 0.05 },
  { v: 'fidelity.com', w: 0.05 }, { v: 'schwab.com', w: 0.05 }, { v: 'vanguard.com', w: 0.05 },
  { v: 'targetx.com', w: 0.05 }, { v: 'walmart.com', w: 0.05 }, { v: 'fedex.com', w: 0.05 },
  { v: 'ups.com', w: 0.05 }, { v: 'usps.com', w: 0.05 }, { v: 'aaa.com', w: 0.05 },
];

const CARD_BINS = {
  visa_credit: ['414720', '426684', '454313', '476173', '491880'],
  visa_debit: ['400115', '408227', '426428'],
  mc_credit: ['516730', '531234', '545454', '554960'],
  mc_debit: ['510076', '519316'],
  amex: ['374251', '378282'],
  discover: ['601100', '644000'],
  prepaid: ['422929', '486432'],
};

// ISP IP ranges (residential + mobile)
type IspRange = { isp: string; prefix: string };
const IP_RANGES: IspRange[] = [
  { isp: 'comcast', prefix: '73.' },
  { isp: 'comcast', prefix: '96.' },
  { isp: 'comcast', prefix: '98.' },
  { isp: 'att', prefix: '99.' },
  { isp: 'att', prefix: '107.' },
  { isp: 'verizon', prefix: '71.' },
  { isp: 'verizon', prefix: '174.' },
  { isp: 't_mobile', prefix: '172.' },
  { isp: 't_mobile', prefix: '184.' },
  { isp: 'spectrum', prefix: '68.' },
  { isp: 'spectrum', prefix: '97.' },
  { isp: 'cox', prefix: '70.' },
  { isp: 'cox', prefix: '174.' },
];
const VPN_RANGES = ['104.', '162.'];

const USER_AGENTS = [
  // Distribution targets (per spec):
  { v: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', w: 18 },
  { v: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', w: 17 },
  { v: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', w: 16 },
  { v: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1', w: 12 },
  { v: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36', w: 10 },
  { v: 'Mozilla/5.0 (Linux; Android 14; SM-S908U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36', w: 8 },
  { v: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', w: 7 },
  { v: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15', w: 5 },
  { v: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0', w: 5 },
  { v: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', w: 2 },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function pickCity(): City {
  // State weights per spec
  const stateWeights: Record<string, number> = {
    CA: 22, NY: 14, TX: 11, FL: 8, IL: 5, PA: 4, OH: 4, GA: 3, WA: 3,
  };
  // Sum used = 74. Remaining 26% across other states.
  const r = rand() * 100;
  let cumulative = 0;
  for (const [state, w] of Object.entries(stateWeights)) {
    cumulative += w;
    if (r < cumulative) {
      const inState = CITIES.filter((c) => c.state === state);
      return pick(inState);
    }
  }
  // Other states
  const other = CITIES.filter((c) => !(c.state in stateWeights));
  return pick(other);
}

function genAddress(c: City, opts?: { withUnit?: boolean; unitStyle?: 'Apt' | 'Unit' | '#' | 'Suite' }): { line: string; zip: string } {
  const num = randInt(10, 9999);
  const street = pick(STREET_NAMES);
  const type = pick(STREET_TYPES);
  const zip = pick(c.zips);
  let line = `${num} ${street} ${type}`;
  const isApt = (opts?.withUnit ?? chance(0.35));
  if (isApt) {
    const unitNum = String(randInt(1, 30)) + (chance(0.4) ? pick(['A','B','C','D','E','F']) : '');
    const style = opts?.unitStyle ?? pick(['Apt','Unit','#','Suite']);
    line += style === '#' ? ` #${unitNum}` : ` ${style} ${unitNum}`;
  }
  line += `, ${c.city}, ${c.state} ${zip}`;
  return { line, zip };
}

// Vary address representation while keeping the same canonical address
function varyAddress(base: string): string {
  // e.g. "123 Oak St Apt 4B, City, ST 90001" → "123 Oak Street Apt 4B" or "#4B" or no unit
  let s = base;
  if (chance(0.3)) {
    s = s.replace(' St ', ' Street ').replace(' Ave ', ' Avenue ').replace(' Blvd ', ' Boulevard ').replace(' Dr ', ' Drive ').replace(' Rd ', ' Road ').replace(' Ln ', ' Lane ');
  }
  if (chance(0.4)) {
    s = s.replace(/ Apt /, ' #').replace(/ Unit /, ' #').replace(/ Suite /, ' #');
  } else if (chance(0.3)) {
    s = s.replace(/ Apt /, ' Apartment ');
  }
  return s;
}

function genPhone(opts?: { format?: 'paren' | 'dash' | 'plus' | 'random'; areaCode?: string }): string {
  const ac = opts?.areaCode ?? String(randInt(201, 999));
  const exch = String(randInt(200, 999));
  const sub = String(randInt(0, 9999)).padStart(4, '0');
  const fmt = opts?.format === 'random' || !opts?.format ? pick(['paren','dash','plus'] as const) : opts.format;
  switch (fmt) {
    case 'paren': return `(${ac}) ${exch}-${sub}`;
    case 'dash': return `${ac}-${exch}-${sub}`;
    case 'plus': return `+1${ac}${exch}${sub}`;
  }
}

function genIp(isp?: string): string {
  let range: IspRange;
  if (isp) {
    const matches = IP_RANGES.filter((r) => r.isp === isp);
    range = matches.length ? pick(matches) : pick(IP_RANGES);
  } else {
    range = pick(IP_RANGES);
  }
  return range.prefix + randInt(1, 254) + '.' + randInt(0, 254) + '.' + randInt(0, 254);
}

function genVpnIp(): string {
  return pick(VPN_RANGES) + randInt(1, 254) + '.' + randInt(0, 254) + '.' + randInt(0, 254);
}

function genEmail(first: string, last: string, opts?: { domain?: string; styleIdx?: number }): string {
  const f = first.toLowerCase().replace(/[^a-z]/g, '');
  const l = last.toLowerCase().replace(/[^a-z]/g, '');
  const domain = opts?.domain ?? weightedPick(EMAIL_DOMAINS);
  const style = opts?.styleIdx ?? randInt(0, 6);
  switch (style) {
    case 0: return `${f}.${l}@${domain}`;
    case 1: return `${f}${l}${randInt(10, 9999)}@${domain}`;
    case 2: return `${f.charAt(0)}.${l}@${domain}`;
    case 3: return `${f}${l}@${domain}`;
    case 4: return `${f}_${l}@${domain}`;
    case 5: return `${l}.${f}@${domain}`;
    case 6: return `${f}.${l}${randInt(1, 99)}@${domain}`;
    default: return `${f}.${l}@${domain}`;
  }
}

function nameVariants(first: string, last: string): { first: string; last: string }[] {
  const out = [{ first, last }];
  // shorter form
  if (first.length > 4) out.push({ first: first.charAt(0) + first.slice(1).toLowerCase(), last });
  // misspell last
  if (last.length > 3) {
    const lc = last.split('');
    if (chance(0.5)) lc[randInt(1, lc.length - 1)] = lc[randInt(1, lc.length - 1)];
    out.push({ first, last: lc.join('') });
  }
  // diminutive (Mike vs Michael)
  const diminutives: Record<string, string[]> = {
    Michael: ['Mike', 'Mick'],
    Robert: ['Bob', 'Rob', 'Bobby'],
    William: ['Will', 'Bill', 'Billy'],
    James: ['Jim', 'Jimmy'],
    Richard: ['Rick', 'Dick'],
    Joseph: ['Joe', 'Joey'],
    Thomas: ['Tom', 'Tommy'],
    Christopher: ['Chris'],
    Daniel: ['Dan', 'Danny'],
    Matthew: ['Matt'],
    Anthony: ['Tony'],
    Charles: ['Charlie', 'Chuck'],
    Patrick: ['Pat'],
    Nicholas: ['Nick'],
    Jennifer: ['Jen', 'Jenny'],
    Elizabeth: ['Liz', 'Beth', 'Betsy'],
    Patricia: ['Pat', 'Patty'],
    Katherine: ['Kate', 'Kathy'],
    Margaret: ['Maggie', 'Meg'],
  };
  if (diminutives[first]) {
    out.push({ first: pick(diminutives[first]), last });
  }
  return out;
}

function pad(n: number, w = 6): string {
  return String(n).padStart(w, '0');
}

function pickPaymentMethod(isFraud: boolean): string {
  if (isFraud) {
    return weightedPick([
      { v: 'credit_card', w: 65 },
      { v: 'debit_card', w: 20 },
      { v: 'paypal', w: 15 },
    ]);
  }
  return weightedPick([
    { v: 'credit_card', w: 40 },
    { v: 'debit_card', w: 25 },
    { v: 'paypal', w: 15 },
    { v: 'apple_pay', w: 10 },
    { v: 'google_pay', w: 5 },
    { v: 'affirm', w: 2.5 },
    { v: 'afterpay', w: 2.5 },
  ]);
}

function pickBin(payment: string, isFraud: boolean): { bin: string; type: string } {
  if (payment === 'debit_card') {
    return chance(0.65)
      ? { bin: pick(CARD_BINS.visa_debit), type: 'visa_debit' }
      : { bin: pick(CARD_BINS.mc_debit), type: 'mc_debit' };
  }
  // credit_card or paypal (we still attribute a card BIN for paypal as the linked card)
  if (isFraud && chance(0.35)) {
    return { bin: pick(CARD_BINS.prepaid), type: 'prepaid' };
  }
  return weightedPick([
    { v: { bin: pick(CARD_BINS.visa_credit), type: 'visa_credit' }, w: 40 },
    { v: { bin: pick(CARD_BINS.mc_credit), type: 'mc_credit' }, w: 30 },
    { v: { bin: pick(CARD_BINS.amex), type: 'amex' }, w: 12 },
    { v: { bin: pick(CARD_BINS.discover), type: 'discover' }, w: 8 },
    { v: { bin: pick(CARD_BINS.prepaid), type: 'prepaid' }, w: isFraud ? 30 : 5 },
  ]);
}

function pickLast4(): string {
  return String(randInt(0, 9999)).padStart(4, '0');
}

function pickRealisticValue(min: number, max: number): string {
  // Avoid round numbers — generate values like 47.99, 123.00, 67.50
  const v = min + rand() * (max - min);
  const r = chance(0.55) ? v.toFixed(2) : v.toFixed(0) + '.' + pick(['00','50','99','95','49','25','75']);
  // Replace integer .XX
  return Number(r).toFixed(2);
}

function genFingerprint(): string { return hex(32); }
function genCookie(): string { return 'ck_' + hex(24); }

// ─────────────────────────────────────────────────────────────────────────────
// ORDER & TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Order {
  order_id: string;
  merchant_id: 'merchant_a' | 'merchant_b';
  order_date: string;
  customer_email: string;
  customer_name: string;
  phone_number: string;
  shipping_address: string;
  billing_address: string;
  order_value: string;
  order_status: string;
  payment_method: string;
  card_last4: string;
  card_bin: string;
  account_created_at: string;
  previous_order_count: string;
  device_ip: string;
  browser_fingerprint: string;
  cookie_id: string;
  user_agent: string;
  delivery_status: string;
  refund_claimed: string;
  refund_reason: string;
  refund_date: string;
  chargeback_filed: string;
  ground_truth_label: 'FRAUDSTER' | 'SUSPICIOUS' | 'LEGITIMATE' | 'LEGITIMATE_SHARED';
  _label_is_fraud: string;
  _cohort: number;
  _subtype: string;
  _cluster_id: string;
  _ring_id?: string;
  _trap_id?: string;
}

interface Cluster {
  cluster_id: string;
  cohort: number;
  subtype: string;
  ground_truth_label: 'FRAUDSTER' | 'SUSPICIOUS' | 'LEGITIMATE' | 'LEGITIMATE_SHARED';
  order_ids: string[];
  canonical_signals: {
    emails: string[];
    card_last4s: string[];
    ips: string[];
    addresses: string[];
    phones: string[];
    names: string[];
  };
  should_link_to: string[];
  must_not_link_to: string[];
}

interface Ring {
  ring_id: string;
  type: string;
  cohort: number;
  subtype: string;
  merchant_a_order_ids: string[];
  merchant_b_order_ids: string[];
  cluster_id: string;
  shared_signals: string[];
  expected_co_occurrence: boolean;
  link_confidence: 'high' | 'medium' | 'low';
}

interface Trap {
  trap_id: string;
  subtype: string;
  description: string;
  innocent_order_ids: string[];
  shadowed_cluster_id: string;
  shared_signal: string;
  shared_signal_value: string;
  should_be_linked: boolean;
  why_it_shouldnt_link: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STATE
// ─────────────────────────────────────────────────────────────────────────────

const ALL_ORDERS: Order[] = [];
const ALL_CLUSTERS: Cluster[] = [];
const ALL_RINGS: Ring[] = [];
const ALL_TRAPS: Trap[] = [];

let _orderIdSeq = 1;
function nextOrderId(): string {
  return 'ORD' + pad(_orderIdSeq++, 6);
}

const TODAY = new Date('2026-05-18T00:00:00Z');
const WINDOW_DAYS = 180;
function dateOffset(daysAgo: number, jitterHours = 24): string {
  const ms = TODAY.getTime() - daysAgo * 86400000 + randInt(0, jitterHours * 3600 * 1000);
  return new Date(ms).toISOString();
}

function nextDateBurst(startDaysAgo: number, burstDays = 5): string {
  return dateOffset(startDaysAgo - randInt(0, burstDays * 100) / 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// COHORT 6 — LEGITIMATE (built first so fraudsters can shadow names without collision)
// We build legitimate customers as a name pool to draw from, then build the legitimate cohort.
// ─────────────────────────────────────────────────────────────────────────────

interface PersonProfile {
  first: string;
  last: string;
  email: string;
  phone: string;
  address: string;
  zip: string;
  city: City;
  card_bin: string;
  card_last4: string;
  ip: string;
  browser_fp: string;
  cookie: string;
  user_agent: string;
  payment_method: string;
  account_created_at: string;
}

function newPerson(opts?: { isFraud?: boolean }): PersonProfile {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const city = pickCity();
  const { line: address } = genAddress(city);
  const payment_method = pickPaymentMethod(opts?.isFraud ?? false);
  const { bin } = pickBin(payment_method, opts?.isFraud ?? false);
  const accountAgeDays = opts?.isFraud
    ? randInt(0, 7)
    : weightedPick([
        { v: randInt(0, 13), w: 15 },
        { v: randInt(14, 90), w: 25 },
        { v: randInt(91, 730), w: 60 },
      ]);
  return {
    first,
    last,
    email: genEmail(first, last),
    phone: chance(0.1) ? '' : genPhone(),
    address,
    zip: address.match(/(\d{5})$/)?.[1] ?? '00000',
    city,
    card_bin: bin,
    card_last4: pickLast4(),
    ip: genIp(city.ip_isp),
    browser_fp: genFingerprint(),
    cookie: genCookie(),
    user_agent: weightedPick(USER_AGENTS),
    payment_method,
    account_created_at: dateOffset(accountAgeDays + 180),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COHORT 1 — SERIAL INR CLAIMERS (600 orders / 80 identities)
// ─────────────────────────────────────────────────────────────────────────────

function genCohort1(): void {
  const subs = [
    { sub: 'A', custCount: 30, totalOrders: 225 }, // Email rotators
    { sub: 'B', custCount: 25, totalOrders: 200 }, // Card rotators
    { sub: 'C', custCount: 25, totalOrders: 175 }, // Address-only anchor
  ];

  let custIdx = 0;
  for (const { sub, custCount, totalOrders } of subs) {
    const perCust = Math.floor(totalOrders / custCount);
    let remainder = totalOrders - perCust * custCount;
    for (let c = 0; c < custCount; c++) {
      const orderCount = perCust + (remainder > 0 ? 1 : 0) + (chance(0.3) ? randInt(-1, 1) : 0);
      const safeCount = Math.max(3, Math.min(9, orderCount));
      if (remainder > 0) remainder--;
      const merchant: 'merchant_a' | 'merchant_b' = chance(0.55) ? 'merchant_a' : 'merchant_b';

      const baseProfile = newPerson({ isFraud: true });
      const clusterId = `cluster_c1_${sub}_${pad(c + 1, 3)}`;
      const orderIds: string[] = [];
      const emails: string[] = [];
      const last4s: string[] = [];
      const ips: string[] = [];
      const addresses: string[] = [];
      const phones: string[] = [];
      const names: string[] = [];

      // Sub-A: rotate 2-4 emails, keep card+address+IP stable
      // Sub-B: rotate cards every 2-3 orders, keep email+phone+address
      // Sub-C: rotate everything except billing_address

      const emailCount = sub === 'A' ? randInt(2, 4) : sub === 'C' ? safeCount : 1;
      const nameVars = nameVariants(baseProfile.first, baseProfile.last);
      const emailPool: string[] = [];
      for (let i = 0; i < emailCount; i++) {
        const nv = nameVars[i % nameVars.length];
        emailPool.push(genEmail(nv.first, nv.last, { styleIdx: i % 6 }));
      }

      // For Sub-C: billing_address is stable, shipping varies
      const stableBilling = baseProfile.address;
      const stableIp = baseProfile.ip;
      const stableFp = baseProfile.browser_fp;
      const stableCookie = baseProfile.cookie;
      const stablePhone = baseProfile.phone;
      const stableUA = baseProfile.user_agent;

      // Burst timing: 3-4 orders over 4-8 days, gap 14-21 days
      const burstSize = randInt(3, 4);
      let dayCursor = randInt(15, 170);
      let burstIdx = 0;
      let prevOrdersThisIdentity = 0;
      const inrThreshold = 0.6; // ≥60% have refund_claimed=true with INR

      for (let oi = 0; oi < safeCount; oi++) {
        if (burstIdx >= burstSize) {
          dayCursor -= randInt(14, 21);
          burstIdx = 0;
        }
        const oDay = dayCursor - randInt(0, 5);
        burstIdx++;
        const orderId = nextOrderId();
        orderIds.push(orderId);

        // Sub-A: rotate emails per order
        let email = baseProfile.email;
        let name = `${baseProfile.first} ${baseProfile.last}`;
        if (sub === 'A') {
          email = emailPool[oi % emailPool.length];
          const nv = nameVars[oi % nameVars.length];
          name = `${nv.first} ${nv.last}`;
        }

        // Sub-B: rotate cards every 2-3 orders
        let bin = baseProfile.card_bin;
        let last4 = baseProfile.card_last4;
        if (sub === 'B') {
          const rotationCycle = Math.floor(oi / randInt(2, 3));
          // Different cards per cycle
          const cyclePM = pickPaymentMethod(true);
          bin = pickBin(cyclePM, true).bin;
          last4 = `${pad(((parseInt(baseProfile.card_last4, 10) + rotationCycle * 137) % 10000), 4)}`;
        }

        // Sub-C: rotate email, card, phone, name, shipping address — only billing stable
        let phone = stablePhone;
        let shippingAddr = baseProfile.address;
        let billingAddr = baseProfile.address;
        let ip = stableIp;
        let bfp = stableFp;
        let cookie = stableCookie;

        if (sub === 'C') {
          email = genEmail(pick(FIRST_NAMES), pick(LAST_NAMES), { styleIdx: oi % 6 });
          name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
          phone = genPhone();
          const cityVar = pickCity();
          shippingAddr = genAddress(cityVar).line;
          // Rotate card too
          const cyclePM = pickPaymentMethod(true);
          bin = pickBin(cyclePM, true).bin;
          last4 = pickLast4();
          billingAddr = varyAddress(baseProfile.address);
        } else {
          // Sub-A/B: shipping = billing = same address, vary representation
          shippingAddr = chance(0.4) ? varyAddress(baseProfile.address) : baseProfile.address;
          billingAddr = shippingAddr;
        }

        const isInr = chance(0.65); // ≥60%
        const refundClaimed = isInr || chance(0.15);
        const refundDate = refundClaimed ? dateOffset(oDay - (oi > safeCount / 2 ? randInt(1, 4) : randInt(7, 14))) : '';
        const chargebackFiled = chance(0.25) || (oi === safeCount - 1 && chance(0.7));
        const deliveryStatus = isInr ? pick(['In Transit', 'Out for Delivery']) : 'Delivered';
        const orderStatus = refundClaimed ? 'refunded' : 'completed';
        const merchantValueRange = merchant === 'merchant_a' ? { min: 75, max: 180 } : { min: 50, max: 140 };

        const order: Order = {
          order_id: orderId,
          merchant_id: merchant,
          order_date: dateOffset(Math.max(1, oDay)),
          customer_email: email,
          customer_name: name,
          phone_number: chance(0.05) ? '' : phone,
          shipping_address: shippingAddr,
          billing_address: billingAddr,
          order_value: pickRealisticValue(merchantValueRange.min, merchantValueRange.max),
          order_status: orderStatus,
          payment_method: pickPaymentMethod(true),
          card_last4: last4,
          card_bin: bin,
          account_created_at: baseProfile.account_created_at,
          previous_order_count: String(prevOrdersThisIdentity),
          device_ip: ip,
          browser_fingerprint: chance(0.4) ? genFingerprint() : bfp, // 40% rotate
          cookie_id: cookie,
          user_agent: chance(0.3) ? weightedPick(USER_AGENTS) : stableUA,
          delivery_status: deliveryStatus,
          refund_claimed: refundClaimed ? 'true' : 'false',
          refund_reason: refundClaimed ? (isInr ? 'Item not received' : pick(['Wrong size received', 'Item damaged on arrival'])) : '',
          refund_date: refundDate,
          chargeback_filed: chargebackFiled ? 'true' : 'false',
          ground_truth_label: sub === 'C' && chance(0.3) ? 'SUSPICIOUS' : 'FRAUDSTER',
          _label_is_fraud: 'true',
          _cohort: 1,
          _subtype: sub,
          _cluster_id: clusterId,
        };
        ALL_ORDERS.push(order);
        if (!emails.includes(email)) emails.push(email);
        if (!last4s.includes(last4)) last4s.push(last4);
        if (!ips.includes(ip)) ips.push(ip);
        if (!addresses.includes(shippingAddr)) addresses.push(shippingAddr);
        if (phone && !phones.includes(phone)) phones.push(phone);
        if (!names.includes(name)) names.push(name);
        prevOrdersThisIdentity++;
      }

      ALL_CLUSTERS.push({
        cluster_id: clusterId,
        cohort: 1,
        subtype: sub,
        ground_truth_label: 'FRAUDSTER',
        order_ids: orderIds,
        canonical_signals: { emails, card_last4s: last4s, ips, addresses, phones, names },
        should_link_to: [],
        must_not_link_to: [],
      });
      custIdx++;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COHORT 2 — CROSS-MERCHANT FRAUD RINGS (400 orders / 25 identities)
// ─────────────────────────────────────────────────────────────────────────────

function genCohort2(): void {
  const subs = [
    { sub: 'A', count: 10, ordersTotal: 160, type: 'email_ip_anchored' },
    { sub: 'B', count: 8, ordersTotal: 120, type: 'card_phone_anchored' },
    { sub: 'C', count: 7, ordersTotal: 120, type: 'device_anchored' },
  ];

  let ringSeq = 0;
  for (const { sub, count, ordersTotal, type } of subs) {
    const perId = Math.floor(ordersTotal / count);
    let remainder = ordersTotal - perId * count;
    for (let i = 0; i < count; i++) {
      ringSeq++;
      const ringId = `ring_c2_${sub}_${pad(ringSeq, 3)}`;
      const clusterId = `cluster_c2_${sub}_${pad(ringSeq, 3)}`;
      const totalOrdersForRing = perId + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      const aCount = Math.floor(totalOrdersForRing / 2);
      const bCount = totalOrdersForRing - aCount;
      const baseProfile = newPerson({ isFraud: true });
      const cityB = pickCity();
      const addressB = genAddress(cityB).line;

      const aOrderIds: string[] = [];
      const bOrderIds: string[] = [];
      const allEmails: string[] = [];
      const allLast4s: string[] = [];
      const allIps: string[] = [];
      const allAddresses: string[] = [];
      const allPhones: string[] = [];
      const allNames: string[] = [];

      // Sub-A: same email + IP both merchants, different card per merchant, different name per merchant
      // Sub-B: same card + phone both merchants, different email per merchant, different shipping
      // Sub-C: same device fingerprint + IP both merchants, everything else rotated
      const emailA = baseProfile.email;
      const emailB = sub === 'A' ? baseProfile.email : genEmail(pick(FIRST_NAMES), pick(LAST_NAMES));
      const cardA = { bin: baseProfile.card_bin, last4: baseProfile.card_last4 };
      const cardB = sub === 'B'
        ? { bin: baseProfile.card_bin, last4: baseProfile.card_last4 }
        : { bin: pickBin('credit_card', true).bin, last4: pickLast4() };
      const phoneA = baseProfile.phone || genPhone();
      const phoneB = sub === 'B' ? phoneA : genPhone();
      const ipA = baseProfile.ip;
      const ipB = (sub === 'A' || sub === 'C') ? baseProfile.ip : genIp();
      const fpA = baseProfile.browser_fp;
      const fpB = sub === 'C' ? fpA : genFingerprint();
      const nameAFirst = baseProfile.first;
      const nameALast = baseProfile.last;
      const nameBFirst = sub === 'A' ? pick(FIRST_NAMES) : sub === 'B' ? baseProfile.first : pick(FIRST_NAMES);
      const nameBLast = sub === 'A' ? pick(LAST_NAMES) : sub === 'B' ? baseProfile.last : pick(LAST_NAMES);

      // Activity window: merchant_a in days 60-90, merchant_b 30-50 days later
      const aBaseDay = randInt(70, 120);
      let aDay = aBaseDay;

      let prevA = 0;
      for (let oi = 0; oi < aCount; oi++) {
        const orderId = nextOrderId();
        aOrderIds.push(orderId);
        const refund_claimed = chance(0.8);
        const chargeback_filed = chance(0.3) || (sub === 'B' && oi === aCount - 1);
        const orderValue = pickRealisticValue(80, 200);
        const o: Order = {
          order_id: orderId,
          merchant_id: 'merchant_a',
          order_date: dateOffset(Math.max(2, aDay - randInt(0, 7))),
          customer_email: emailA,
          customer_name: `${nameAFirst} ${nameALast}`,
          phone_number: chance(0.05) ? '' : phoneA,
          shipping_address: baseProfile.address,
          billing_address: baseProfile.address,
          order_value: orderValue,
          order_status: refund_claimed ? 'refunded' : 'completed',
          payment_method: pickPaymentMethod(true),
          card_last4: cardA.last4,
          card_bin: cardA.bin,
          account_created_at: dateOffset(aBaseDay + randInt(0, 3)),
          previous_order_count: String(prevA),
          device_ip: ipA,
          browser_fingerprint: fpA,
          cookie_id: baseProfile.cookie,
          user_agent: baseProfile.user_agent,
          delivery_status: refund_claimed ? pick(['In Transit', 'Out for Delivery']) : 'Delivered',
          refund_claimed: refund_claimed ? 'true' : 'false',
          refund_reason: refund_claimed ? 'Item not received' : '',
          refund_date: refund_claimed ? dateOffset(Math.max(1, aDay - randInt(1, 4))) : '',
          chargeback_filed: chargeback_filed ? 'true' : 'false',
          ground_truth_label: sub === 'C' && chance(0.4) ? 'SUSPICIOUS' : 'FRAUDSTER',
          _label_is_fraud: 'true',
          _cohort: 2,
          _subtype: sub,
          _cluster_id: clusterId,
          _ring_id: ringId,
        };
        ALL_ORDERS.push(o);
        prevA++;
        aDay -= randInt(0, 3);
      }

      // merchant_b orders 7-28 days later (earlier in time-axis since we go backwards)
      let bDay = aBaseDay - randInt(7, 28);
      let prevB = 0;
      for (let oi = 0; oi < bCount; oi++) {
        const orderId = nextOrderId();
        bOrderIds.push(orderId);
        const refund_claimed = sub === 'B' ? false : chance(0.7);
        const chargeback_filed = sub === 'B' ? true : chance(0.4);
        const orderValue = pickRealisticValue(75, 230);
        const merchantBAddress = sub === 'B' ? addressB : (sub === 'A' ? addressB : addressB);
        const o: Order = {
          order_id: orderId,
          merchant_id: 'merchant_b',
          order_date: dateOffset(Math.max(2, bDay - randInt(0, 7))),
          customer_email: emailB,
          customer_name: `${nameBFirst} ${nameBLast}`,
          phone_number: chance(0.05) ? '' : phoneB,
          shipping_address: merchantBAddress,
          billing_address: merchantBAddress,
          order_value: orderValue,
          order_status: refund_claimed ? 'refunded' : (chargeback_filed ? 'completed' : 'completed'),
          payment_method: pickPaymentMethod(true),
          card_last4: cardB.last4,
          card_bin: cardB.bin,
          account_created_at: dateOffset(bDay + randInt(0, 3)),
          previous_order_count: String(prevB),
          device_ip: ipB,
          browser_fingerprint: fpB,
          cookie_id: baseProfile.cookie,
          user_agent: chance(0.3) ? weightedPick(USER_AGENTS) : baseProfile.user_agent,
          delivery_status: refund_claimed ? pick(['In Transit', 'Out for Delivery']) : 'Delivered',
          refund_claimed: refund_claimed ? 'true' : 'false',
          refund_reason: refund_claimed ? 'Item not received' : '',
          refund_date: refund_claimed ? dateOffset(Math.max(1, bDay - randInt(1, 4))) : '',
          chargeback_filed: chargeback_filed ? 'true' : 'false',
          ground_truth_label: sub === 'C' && chance(0.4) ? 'SUSPICIOUS' : 'FRAUDSTER',
          _label_is_fraud: 'true',
          _cohort: 2,
          _subtype: sub,
          _cluster_id: clusterId,
          _ring_id: ringId,
        };
        ALL_ORDERS.push(o);
        prevB++;
        bDay -= randInt(0, 3);
      }

      const shared = sub === 'A' ? ['customer_email', 'device_ip']
        : sub === 'B' ? ['card_last4', 'card_bin', 'phone_number']
        : ['browser_fingerprint', 'device_ip'];

      ALL_RINGS.push({
        ring_id: ringId,
        type: type,
        cohort: 2,
        subtype: sub,
        merchant_a_order_ids: aOrderIds,
        merchant_b_order_ids: bOrderIds,
        cluster_id: clusterId,
        shared_signals: shared,
        expected_co_occurrence: true,
        link_confidence: sub === 'A' ? 'high' : sub === 'B' ? 'medium' : 'low',
      });

      allEmails.push(emailA);
      if (emailB !== emailA) allEmails.push(emailB);
      allLast4s.push(cardA.last4);
      if (cardB.last4 !== cardA.last4) allLast4s.push(cardB.last4);
      allIps.push(ipA);
      if (ipB !== ipA) allIps.push(ipB);
      allAddresses.push(baseProfile.address);
      if (addressB !== baseProfile.address) allAddresses.push(addressB);
      if (phoneA) allPhones.push(phoneA);
      if (phoneB && phoneB !== phoneA) allPhones.push(phoneB);
      allNames.push(`${nameAFirst} ${nameALast}`);
      allNames.push(`${nameBFirst} ${nameBLast}`);

      ALL_CLUSTERS.push({
        cluster_id: clusterId,
        cohort: 2,
        subtype: sub,
        ground_truth_label: 'FRAUDSTER',
        order_ids: [...aOrderIds, ...bOrderIds],
        canonical_signals: { emails: allEmails, card_last4s: allLast4s, ips: allIps, addresses: allAddresses, phones: allPhones, names: allNames },
        should_link_to: [],
        must_not_link_to: [],
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COHORT 3 — RETURN FRAUD / WARDROBING (500 orders / 60 identities)
// ─────────────────────────────────────────────────────────────────────────────

function genCohort3(): void {
  const idCount = 60;
  const totalOrders = 500;
  const perId = Math.round(totalOrders / idCount);
  let remainder = totalOrders - perId * idCount;
  for (let i = 0; i < idCount; i++) {
    const safeCount = Math.max(2, perId + (remainder > 0 ? 1 : 0) + (chance(0.3) ? randInt(-1, 1) : 0));
    if (remainder > 0) remainder--;
    const merchant: 'merchant_a' | 'merchant_b' = chance(0.55) ? 'merchant_a' : 'merchant_b';
    const baseProfile = newPerson({ isFraud: false }); // older account
    // Override account age to 30-180 days
    baseProfile.account_created_at = dateOffset(randInt(30, 180) + 180);
    const clusterId = `cluster_c3_${pad(i + 1, 3)}`;
    const orderIds: string[] = [];
    let prev = randInt(1, 4); // 1-4 prior legit orders
    let dayCursor = randInt(20, 170);
    for (let oi = 0; oi < safeCount; oi++) {
      const orderId = nextOrderId();
      orderIds.push(orderId);
      const isReturnFraud = chance(0.85);
      const refundReason = isReturnFraud
        ? weightedPick([
            { v: 'Item damaged on arrival', w: 40 },
            { v: 'Wrong size received', w: 25 },
            { v: 'Not as described', w: 20 },
            { v: 'Missing parts', w: 15 },
          ])
        : '';
      const orderValue = parseFloat(pickRealisticValue(
        merchant === 'merchant_a' ? 60 : 35,
        merchant === 'merchant_a' ? 280 : 350,
      ));
      const chargeback = orderValue > 150 && chance(0.3);
      const o: Order = {
        order_id: orderId,
        merchant_id: merchant,
        order_date: dateOffset(Math.max(2, dayCursor)),
        customer_email: baseProfile.email,
        customer_name: `${baseProfile.first} ${baseProfile.last}`,
        phone_number: baseProfile.phone || genPhone(),
        shipping_address: chance(0.3) ? varyAddress(baseProfile.address) : baseProfile.address,
        billing_address: baseProfile.address,
        order_value: orderValue.toFixed(2),
        order_status: isReturnFraud ? 'refunded' : 'completed',
        payment_method: baseProfile.payment_method,
        card_last4: baseProfile.card_last4,
        card_bin: baseProfile.card_bin,
        account_created_at: baseProfile.account_created_at,
        previous_order_count: String(prev),
        device_ip: baseProfile.ip,
        browser_fingerprint: chance(0.15) ? genFingerprint() : baseProfile.browser_fp,
        cookie_id: baseProfile.cookie,
        user_agent: baseProfile.user_agent,
        delivery_status: 'Delivered',
        refund_claimed: isReturnFraud ? 'true' : 'false',
        refund_reason: refundReason,
        refund_date: isReturnFraud ? dateOffset(Math.max(1, dayCursor - randInt(3, 10))) : '',
        chargeback_filed: chargeback ? 'true' : 'false',
        ground_truth_label: 'FRAUDSTER',
        _label_is_fraud: 'true',
        _cohort: 3,
        _subtype: '',
        _cluster_id: clusterId,
      };
      ALL_ORDERS.push(o);
      prev++;
      dayCursor -= randInt(3, 10);
    }
    ALL_CLUSTERS.push({
      cluster_id: clusterId,
      cohort: 3,
      subtype: '',
      ground_truth_label: 'FRAUDSTER',
      order_ids: orderIds,
      canonical_signals: { emails: [baseProfile.email], card_last4s: [baseProfile.card_last4], ips: [baseProfile.ip], addresses: [baseProfile.address], phones: baseProfile.phone ? [baseProfile.phone] : [], names: [`${baseProfile.first} ${baseProfile.last}`] },
      should_link_to: [],
      must_not_link_to: [],
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COHORT 4 — CHARGEBACK SPECIALISTS (300 orders / 35 identities)
// ─────────────────────────────────────────────────────────────────────────────

function genCohort4(): void {
  const subA = 20; // habitual chargebackers
  const subB = 15; // burst chargebackers
  const totalA = Math.round(300 * subA / 35); // ~171
  const totalB = 300 - totalA;

  let seq = 0;
  // Sub-A: 1-2 legit orders, then 80%+ chargebacks
  const perA = Math.floor(totalA / subA);
  let remA = totalA - perA * subA;
  for (let i = 0; i < subA; i++) {
    seq++;
    const safeCount = Math.max(3, perA + (remA > 0 ? 1 : 0) + (chance(0.4) ? randInt(-1, 1) : 0));
    if (remA > 0) remA--;
    const baseProfile = newPerson({ isFraud: false });
    baseProfile.account_created_at = dateOffset(randInt(60, 360) + 180);
    const clusterId = `cluster_c4_A_${pad(seq, 3)}`;
    const orderIds: string[] = [];
    const merchant: 'merchant_a' | 'merchant_b' = chance(0.55) ? 'merchant_a' : 'merchant_b';
    let dayCursor = randInt(20, 170);
    let prev = 0;
    for (let oi = 0; oi < safeCount; oi++) {
      const orderId = nextOrderId();
      orderIds.push(orderId);
      const isLegitSeed = oi < 2; // first 2 legit
      const chargeback = !isLegitSeed && chance(0.85);
      const orderValue = pickRealisticValue(50, 400);
      const o: Order = {
        order_id: orderId,
        merchant_id: merchant,
        order_date: dateOffset(Math.max(2, dayCursor)),
        customer_email: baseProfile.email,
        customer_name: `${baseProfile.first} ${baseProfile.last}`,
        phone_number: baseProfile.phone || genPhone(),
        shipping_address: baseProfile.address,
        billing_address: baseProfile.address,
        order_value: orderValue,
        order_status: 'completed',
        payment_method: baseProfile.payment_method,
        card_last4: baseProfile.card_last4,
        card_bin: baseProfile.card_bin,
        account_created_at: baseProfile.account_created_at,
        previous_order_count: String(prev),
        device_ip: baseProfile.ip,
        browser_fingerprint: baseProfile.browser_fp,
        cookie_id: baseProfile.cookie,
        user_agent: baseProfile.user_agent,
        delivery_status: 'Delivered',
        refund_claimed: 'false',
        refund_reason: '',
        refund_date: '',
        chargeback_filed: chargeback ? 'true' : 'false',
        ground_truth_label: 'FRAUDSTER',
        _label_is_fraud: 'true',
        _cohort: 4,
        _subtype: 'A',
        _cluster_id: clusterId,
      };
      ALL_ORDERS.push(o);
      prev++;
      dayCursor -= randInt(3, 14);
    }
    ALL_CLUSTERS.push({
      cluster_id: clusterId,
      cohort: 4,
      subtype: 'A',
      ground_truth_label: 'FRAUDSTER',
      order_ids: orderIds,
      canonical_signals: { emails: [baseProfile.email], card_last4s: [baseProfile.card_last4], ips: [baseProfile.ip], addresses: [baseProfile.address], phones: baseProfile.phone ? [baseProfile.phone] : [], names: [`${baseProfile.first} ${baseProfile.last}`] },
      should_link_to: [],
      must_not_link_to: [],
    });
  }
  // Sub-B: burst — 3-5 orders in one week, all chargebacks
  const perB = Math.round(totalB / subB);
  let remB = totalB - perB * subB;
  for (let i = 0; i < subB; i++) {
    seq++;
    const safeCount = Math.max(3, Math.min(5, perB + (remB > 0 ? 1 : 0)));
    if (remB > 0) remB--;
    const baseProfile = newPerson({ isFraud: true });
    baseProfile.account_created_at = dateOffset(randInt(0, 7) + 180);
    const clusterId = `cluster_c4_B_${pad(seq, 3)}`;
    const orderIds: string[] = [];
    const merchant: 'merchant_a' | 'merchant_b' = chance(0.55) ? 'merchant_a' : 'merchant_b';
    let dayCursor = randInt(20, 170);
    let prev = 0;
    for (let oi = 0; oi < safeCount; oi++) {
      const orderId = nextOrderId();
      orderIds.push(orderId);
      const orderValue = pickRealisticValue(60, 350);
      const o: Order = {
        order_id: orderId,
        merchant_id: merchant,
        order_date: dateOffset(Math.max(2, dayCursor - oi)),
        customer_email: baseProfile.email,
        customer_name: `${baseProfile.first} ${baseProfile.last}`,
        phone_number: baseProfile.phone || genPhone(),
        shipping_address: baseProfile.address,
        billing_address: baseProfile.address,
        order_value: orderValue,
        order_status: 'completed',
        payment_method: baseProfile.payment_method,
        card_last4: baseProfile.card_last4,
        card_bin: baseProfile.card_bin,
        account_created_at: baseProfile.account_created_at,
        previous_order_count: String(prev),
        device_ip: baseProfile.ip,
        browser_fingerprint: baseProfile.browser_fp,
        cookie_id: baseProfile.cookie,
        user_agent: baseProfile.user_agent,
        delivery_status: 'Delivered',
        refund_claimed: 'false',
        refund_reason: '',
        refund_date: '',
        chargeback_filed: 'true',
        ground_truth_label: 'FRAUDSTER',
        _label_is_fraud: 'true',
        _cohort: 4,
        _subtype: 'B',
        _cluster_id: clusterId,
      };
      ALL_ORDERS.push(o);
      prev++;
    }
    ALL_CLUSTERS.push({
      cluster_id: clusterId,
      cohort: 4,
      subtype: 'B',
      ground_truth_label: 'FRAUDSTER',
      order_ids: orderIds,
      canonical_signals: { emails: [baseProfile.email], card_last4s: [baseProfile.card_last4], ips: [baseProfile.ip], addresses: [baseProfile.address], phones: baseProfile.phone ? [baseProfile.phone] : [], names: [`${baseProfile.first} ${baseProfile.last}`] },
      should_link_to: [],
      must_not_link_to: [],
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COHORT 5 — FIRST-ORDER FRAUDSTERS (200 orders / 200 identities)
// 50 network-linked → FRAUDSTER, 150 isolated → SUSPICIOUS
// ─────────────────────────────────────────────────────────────────────────────

function genCohort5(): void {
  // Group A: 50 customers share IP or fingerprint with a known fraudster (Cohort 1 or 2)
  // We pick from clusters that already have IPs/fingerprints assigned.
  const fraudsterClusters = ALL_CLUSTERS.filter((c) => c.cohort === 1 || c.cohort === 2);
  for (let i = 0; i < 50; i++) {
    const target = pick(fraudsterClusters);
    const useIp = target.canonical_signals.ips.length > 0 && (chance(0.6) || target.cohort === 2);
    const sharedIp = useIp ? pick(target.canonical_signals.ips) : null;
    // For fingerprint sharing, find an order in this cluster and pick its fp
    let sharedFp: string | null = null;
    if (!sharedIp) {
      const o = ALL_ORDERS.find((x) => x._cluster_id === target.cluster_id);
      if (o) sharedFp = o.browser_fingerprint;
    }
    const profile = newPerson({ isFraud: true });
    if (sharedIp) profile.ip = sharedIp;
    if (sharedFp) profile.browser_fp = sharedFp;
    profile.account_created_at = dateOffset(randInt(0, 1) + 180);
    const orderId = nextOrderId();
    const clusterId = `cluster_c5_A_${pad(i + 1, 3)}`;
    const merchant: 'merchant_a' | 'merchant_b' = chance(0.55) ? 'merchant_a' : 'merchant_b';
    const refundClaim = chance(0.5);
    const chargeback = !refundClaim || chance(0.4);
    const orderValue = pickRealisticValue(50, 350);
    const o: Order = {
      order_id: orderId,
      merchant_id: merchant,
      order_date: dateOffset(Math.max(2, randInt(20, 170))),
      customer_email: profile.email,
      customer_name: `${profile.first} ${profile.last}`,
      phone_number: profile.phone || genPhone(),
      shipping_address: profile.address,
      billing_address: profile.address,
      order_value: orderValue,
      order_status: refundClaim ? 'refunded' : 'completed',
      payment_method: profile.payment_method,
      card_last4: profile.card_last4,
      card_bin: profile.card_bin,
      account_created_at: profile.account_created_at,
      previous_order_count: '0',
      device_ip: profile.ip,
      browser_fingerprint: profile.browser_fp,
      cookie_id: profile.cookie,
      user_agent: profile.user_agent,
      delivery_status: refundClaim ? 'In Transit' : 'Delivered',
      refund_claimed: refundClaim ? 'true' : 'false',
      refund_reason: refundClaim ? 'Item not received' : '',
      refund_date: refundClaim ? dateOffset(Math.max(1, randInt(15, 170))) : '',
      chargeback_filed: chargeback ? 'true' : 'false',
      ground_truth_label: 'FRAUDSTER',
      _label_is_fraud: 'true',
      _cohort: 5,
      _subtype: 'A',
      _cluster_id: clusterId,
    };
    ALL_ORDERS.push(o);
    ALL_CLUSTERS.push({
      cluster_id: clusterId,
      cohort: 5,
      subtype: 'A',
      ground_truth_label: 'FRAUDSTER',
      order_ids: [orderId],
      canonical_signals: { emails: [profile.email], card_last4s: [profile.card_last4], ips: [profile.ip], addresses: [profile.address], phones: profile.phone ? [profile.phone] : [], names: [`${profile.first} ${profile.last}`] },
      should_link_to: [target.cluster_id],
      must_not_link_to: [],
    });
  }
  // Group B: 150 isolated, label SUSPICIOUS
  for (let i = 0; i < 150; i++) {
    const profile = newPerson({ isFraud: true });
    profile.account_created_at = dateOffset(randInt(0, 1) + 180);
    const orderId = nextOrderId();
    const clusterId = `cluster_c5_B_${pad(i + 1, 3)}`;
    const merchant: 'merchant_a' | 'merchant_b' = chance(0.55) ? 'merchant_a' : 'merchant_b';
    const refundClaim = chance(0.6);
    const chargeback = !refundClaim;
    const orderValue = pickRealisticValue(50, 350);
    const o: Order = {
      order_id: orderId,
      merchant_id: merchant,
      order_date: dateOffset(Math.max(2, randInt(20, 170))),
      customer_email: profile.email,
      customer_name: `${profile.first} ${profile.last}`,
      phone_number: profile.phone || genPhone(),
      shipping_address: profile.address,
      billing_address: profile.address,
      order_value: orderValue,
      order_status: refundClaim ? 'refunded' : 'completed',
      payment_method: profile.payment_method,
      card_last4: profile.card_last4,
      card_bin: profile.card_bin,
      account_created_at: profile.account_created_at,
      previous_order_count: '0',
      device_ip: profile.ip,
      browser_fingerprint: profile.browser_fp,
      cookie_id: profile.cookie,
      user_agent: profile.user_agent,
      delivery_status: refundClaim ? 'In Transit' : 'Delivered',
      refund_claimed: refundClaim ? 'true' : 'false',
      refund_reason: refundClaim ? 'Item not received' : '',
      refund_date: refundClaim ? dateOffset(Math.max(1, randInt(15, 170))) : '',
      chargeback_filed: chargeback ? 'true' : 'false',
      ground_truth_label: 'SUSPICIOUS',
      _label_is_fraud: 'false',
      _cohort: 5,
      _subtype: 'B',
      _cluster_id: clusterId,
    };
    ALL_ORDERS.push(o);
    ALL_CLUSTERS.push({
      cluster_id: clusterId,
      cohort: 5,
      subtype: 'B',
      ground_truth_label: 'SUSPICIOUS',
      order_ids: [orderId],
      canonical_signals: { emails: [profile.email], card_last4s: [profile.card_last4], ips: [profile.ip], addresses: [profile.address], phones: profile.phone ? [profile.phone] : [], names: [`${profile.first} ${profile.last}`] },
      should_link_to: [],
      must_not_link_to: [],
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COHORT 6 — LEGITIMATE (12,500 orders padded to hit 15k total)
// ─────────────────────────────────────────────────────────────────────────────

function genCohort6(): void {
  const totalOrders = 12500;
  let placed = 0;
  let clusterSeq = 0;
  while (placed < totalOrders) {
    clusterSeq++;
    const isRepeat = chance(0.4); // 40% repeats per spec
    const orderCount = isRepeat ? randInt(3, 8) : 1;
    if (placed + orderCount > totalOrders) {
      // Fill remaining with one-time
      const remaining = totalOrders - placed;
      for (let r = 0; r < remaining; r++) {
        const p = newPerson({ isFraud: false });
        const orderId = nextOrderId();
        const merchant: 'merchant_a' | 'merchant_b' = chance(0.535) ? 'merchant_a' : 'merchant_b';
        const orderValue = pickRealisticValue(
          merchant === 'merchant_a' ? 18 : 12,
          merchant === 'merchant_a' ? 420 : 380,
        );
        const o: Order = {
          order_id: orderId,
          merchant_id: merchant,
          order_date: dateOffset(randInt(2, 178)),
          customer_email: p.email,
          customer_name: `${p.first} ${p.last}`,
          phone_number: p.phone,
          shipping_address: p.address,
          billing_address: p.address,
          order_value: orderValue,
          order_status: 'completed',
          payment_method: p.payment_method,
          card_last4: p.card_last4,
          card_bin: p.card_bin,
          account_created_at: p.account_created_at,
          previous_order_count: '0',
          device_ip: p.ip,
          browser_fingerprint: p.browser_fp,
          cookie_id: p.cookie,
          user_agent: p.user_agent,
          delivery_status: 'Delivered',
          refund_claimed: 'false',
          refund_reason: '',
          refund_date: '',
          chargeback_filed: 'false',
          ground_truth_label: 'LEGITIMATE',
          _label_is_fraud: 'false',
          _cohort: 6,
          _subtype: 'one_time',
          _cluster_id: `cluster_c6_${pad(clusterSeq, 4)}`,
        };
        ALL_ORDERS.push(o);
        ALL_CLUSTERS.push({
          cluster_id: o._cluster_id,
          cohort: 6,
          subtype: 'one_time',
          ground_truth_label: 'LEGITIMATE',
          order_ids: [orderId],
          canonical_signals: { emails: [p.email], card_last4s: [p.card_last4], ips: [p.ip], addresses: [p.address], phones: p.phone ? [p.phone] : [], names: [`${p.first} ${p.last}`] },
          should_link_to: [],
          must_not_link_to: [],
        });
        placed++;
        clusterSeq++;
      }
      break;
    }
    const p = newPerson({ isFraud: false });
    const clusterId = `cluster_c6_${pad(clusterSeq, 4)}`;
    const merchantPrimary: 'merchant_a' | 'merchant_b' = chance(0.535) ? 'merchant_a' : 'merchant_b';
    const orderIds: string[] = [];
    const altAddress = chance(0.15) && isRepeat ? genAddress(p.city).line : null;
    // Start dayCursor high enough that all orders can be spaced 3-20 days apart
    let dayCursor = randInt(Math.max(5, orderCount * 10), 178);
    let prev = 0;
    let alt_device_fp: string | null = chance(0.2) ? genFingerprint() : null;
    const allEmails = [p.email];
    const allLast4s = [p.card_last4];
    const allIps = [p.ip];
    const allAddresses = [p.address];
    const allPhones = p.phone ? [p.phone] : [];

    for (let oi = 0; oi < orderCount; oi++) {
      const orderId = nextOrderId();
      orderIds.push(orderId);
      const refundClaim = isRepeat && chance(0.06);
      const orderValue = pickRealisticValue(
        merchantPrimary === 'merchant_a' ? 18 : 12,
        merchantPrimary === 'merchant_a' ? 420 : 380,
      );
      const shipAddr = (altAddress && chance(0.2)) ? altAddress : p.address;
      const merchantThisOrder: 'merchant_a' | 'merchant_b' = chance(0.85) ? merchantPrimary : (merchantPrimary === 'merchant_a' ? 'merchant_b' : 'merchant_a');
      const useAltFp = alt_device_fp && chance(0.35);
      const o: Order = {
        order_id: orderId,
        merchant_id: merchantThisOrder,
        order_date: dateOffset(Math.max(2, dayCursor)),
        customer_email: p.email,
        customer_name: `${p.first} ${p.last}`,
        phone_number: p.phone,
        shipping_address: shipAddr,
        billing_address: p.address,
        order_value: orderValue,
        order_status: refundClaim ? 'refunded' : 'completed',
        payment_method: p.payment_method,
        card_last4: p.card_last4,
        card_bin: p.card_bin,
        account_created_at: p.account_created_at,
        previous_order_count: String(prev),
        device_ip: p.ip,
        browser_fingerprint: useAltFp ? alt_device_fp! : p.browser_fp,
        cookie_id: p.cookie,
        user_agent: p.user_agent,
        delivery_status: 'Delivered',
        refund_claimed: refundClaim ? 'true' : 'false',
        refund_reason: refundClaim ? pick(['Wrong size received','Changed mind','Gift not wanted']) : '',
        refund_date: refundClaim ? dateOffset(Math.max(1, dayCursor - oi * randInt(3, 20) - randInt(5, 14))) : '',
        chargeback_filed: 'false',
        ground_truth_label: 'LEGITIMATE',
        _label_is_fraud: 'false',
        _cohort: 6,
        _subtype: isRepeat ? 'repeat' : 'one_time',
        _cluster_id: clusterId,
      };
      ALL_ORDERS.push(o);
      prev++;
      dayCursor -= randInt(3, 20); // cumulative spacing to avoid same-day collisions
      if (shipAddr !== p.address && !allAddresses.includes(shipAddr)) allAddresses.push(shipAddr);
    }
    ALL_CLUSTERS.push({
      cluster_id: clusterId,
      cohort: 6,
      subtype: isRepeat ? 'repeat' : 'one_time',
      ground_truth_label: 'LEGITIMATE',
      order_ids: orderIds,
      canonical_signals: { emails: allEmails, card_last4s: allLast4s, ips: allIps, addresses: allAddresses, phones: allPhones, names: [`${p.first} ${p.last}`] },
      should_link_to: [],
      must_not_link_to: [],
    });
    placed += orderCount;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COHORT 7 — LEGITIMATE_SHARED (500 orders / 500 traps, each shadows a fraudster)
// ─────────────────────────────────────────────────────────────────────────────

function genCohort7(): void {
  const fraudsterClusters = ALL_CLUSTERS.filter((c) =>
    c.ground_truth_label === 'FRAUDSTER' && (c.cohort === 1 || c.cohort === 2 || c.cohort === 3 || c.cohort === 4)
  );
  if (fraudsterClusters.length === 0) {
    throw new Error('No fraudster clusters available — Cohorts 1-4 must run first');
  }

  const subs = [
    { sub: 'A', count: 150, desc: 'same_household', signal: 'shipping_address' },
    { sub: 'B', count: 150, desc: 'shared_ip', signal: 'device_ip' },
    { sub: 'C', count: 75, desc: 'name_near_match', signal: 'customer_name' },
    { sub: 'D', count: 75, desc: 'same_zip', signal: 'shipping_zip' },
    { sub: 'E', count: 50, desc: 'same_card_bin', signal: 'card_bin' },
  ];

  let trapSeq = 0;
  let two_orders_quota = 100; // 100 of the 500 have 2 orders for realism
  for (const { sub, count, desc, signal } of subs) {
    for (let i = 0; i < count; i++) {
      trapSeq++;
      const target = pick(fraudsterClusters);
      // Pick a sample order from target to extract canonical signals
      const targetOrders = ALL_ORDERS.filter((o) => o._cluster_id === target.cluster_id);
      if (targetOrders.length === 0) continue;
      const tOrder = targetOrders[0];

      const profile = newPerson({ isFraud: false });
      // Apply shared signal — based on sub
      let sharedValue = '';
      if (sub === 'A') {
        // Same shipping & billing address as target
        profile.address = tOrder.shipping_address;
        sharedValue = profile.address;
      } else if (sub === 'B') {
        profile.ip = tOrder.device_ip;
        sharedValue = profile.ip;
      } else if (sub === 'C') {
        // Edit distance 1-2 in name
        const targetName = tOrder.customer_name.split(' ');
        const tFirst = targetName[0] ?? 'Alex';
        const tLast = targetName.slice(1).join(' ') || 'Smith';
        // Vary one letter
        const vary = (s: string) => {
          if (s.length < 3) return s + 'e';
          const idx = randInt(1, s.length - 2);
          return s.slice(0, idx) + pick(['a','e','i','o','u','s','n','r','l']) + s.slice(idx + 1);
        };
        profile.first = chance(0.5) ? vary(tFirst) : tFirst;
        profile.last = chance(0.5) ? vary(tLast) : tLast;
        sharedValue = `${profile.first} ${profile.last}`;
      } else if (sub === 'D') {
        // Same ZIP, different street
        const tZip = tOrder.shipping_address.match(/(\d{5})$/)?.[1];
        if (tZip) {
          const tCity = CITIES.find((c) => c.zips.includes(tZip));
          if (tCity) {
            profile.city = tCity;
            // Generate a new address in same city / same ZIP
            const num = randInt(10, 9999);
            const street = pick(STREET_NAMES);
            const type = pick(STREET_TYPES);
            profile.address = `${num} ${street} ${type}, ${tCity.city}, ${tCity.state} ${tZip}`;
            sharedValue = tZip;
          }
        }
      } else if (sub === 'E') {
        profile.card_bin = tOrder.card_bin;
        sharedValue = tOrder.card_bin;
      }

      profile.account_created_at = dateOffset(randInt(45, 400) + 180);
      const innocentOrderIds: string[] = [];
      const orderCount = two_orders_quota > 0 && chance(0.2) ? 2 : 1;
      if (orderCount === 2) two_orders_quota--;

      let prev = randInt(1, 6);
      let dayCursor = randInt(20, 170);
      for (let oi = 0; oi < orderCount; oi++) {
        const orderId = nextOrderId();
        innocentOrderIds.push(orderId);
        const merchant: 'merchant_a' | 'merchant_b' = (tOrder.merchant_id === 'merchant_a' && chance(0.7)) ? 'merchant_a' : (tOrder.merchant_id === 'merchant_b' && chance(0.7)) ? 'merchant_b' : (chance(0.5) ? 'merchant_a' : 'merchant_b');
        const orderValue = pickRealisticValue(
          merchant === 'merchant_a' ? 25 : 18,
          merchant === 'merchant_a' ? 320 : 280,
        );
        const o: Order = {
          order_id: orderId,
          merchant_id: merchant,
          order_date: dateOffset(Math.max(2, dayCursor - oi * randInt(20, 60))),
          customer_email: profile.email,
          customer_name: `${profile.first} ${profile.last}`,
          phone_number: profile.phone || genPhone(),
          shipping_address: profile.address,
          billing_address: profile.address,
          order_value: orderValue,
          order_status: 'completed',
          payment_method: profile.payment_method,
          card_last4: profile.card_last4,
          card_bin: profile.card_bin,
          account_created_at: profile.account_created_at,
          previous_order_count: String(prev),
          device_ip: profile.ip,
          browser_fingerprint: profile.browser_fp,
          cookie_id: profile.cookie,
          user_agent: profile.user_agent,
          delivery_status: 'Delivered',
          refund_claimed: 'false',
          refund_reason: '',
          refund_date: '',
          chargeback_filed: 'false',
          ground_truth_label: 'LEGITIMATE_SHARED',
          _label_is_fraud: 'false',
          _cohort: 7,
          _subtype: sub,
          _cluster_id: `cluster_c7_${sub}_${pad(trapSeq, 3)}`,
          _trap_id: `trap_${sub}_${pad(trapSeq, 3)}`,
        };
        ALL_ORDERS.push(o);
        prev++;
      }
      ALL_CLUSTERS.push({
        cluster_id: `cluster_c7_${sub}_${pad(trapSeq, 3)}`,
        cohort: 7,
        subtype: sub,
        ground_truth_label: 'LEGITIMATE_SHARED',
        order_ids: innocentOrderIds,
        canonical_signals: { emails: [profile.email], card_last4s: [profile.card_last4], ips: [profile.ip], addresses: [profile.address], phones: profile.phone ? [profile.phone] : [], names: [`${profile.first} ${profile.last}`] },
        should_link_to: [],
        must_not_link_to: [target.cluster_id],
      });
      const whyNot = sub === 'A'
        ? 'Address alone is not sufficient — no refund history, different card, email, IP, phone'
        : sub === 'B'
        ? 'Shared IP alone is not sufficient — building-level IP sharing is endemic in dense cities; everything else differs'
        : sub === 'C'
        ? 'Fuzzy name match must not bridge unrelated people — completely different email, address, card, IP, phone'
        : sub === 'D'
        ? 'ZIP-code-level match is far too coarse — a dense urban ZIP contains tens of thousands of households'
        : 'BIN alone identifies the issuing bank, not the customer — millions of customers share each BIN';
      ALL_TRAPS.push({
        trap_id: `trap_${sub}_${pad(trapSeq, 3)}`,
        subtype: sub,
        description: `${desc}: legitimate customer shares ${signal} with fraudster cluster ${target.cluster_id}`,
        innocent_order_ids: innocentOrderIds,
        shadowed_cluster_id: target.cluster_id,
        shared_signal: signal,
        shared_signal_value: sharedValue,
        should_be_linked: false,
        why_it_shouldnt_link: whyNot,
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV WRITER
// ─────────────────────────────────────────────────────────────────────────────

const CSV_COLUMNS: (keyof Order)[] = [
  'order_id','merchant_id','order_date','customer_email','customer_name',
  'phone_number','shipping_address','billing_address','order_value',
  'order_status','payment_method','card_last4','card_bin',
  'account_created_at','previous_order_count','device_ip',
  'browser_fingerprint','cookie_id','user_agent','delivery_status',
  'refund_claimed','refund_reason','refund_date','chargeback_filed',
  'ground_truth_label','_label_is_fraud',
];

function csvEscape(v: string): string {
  if (v == null) return '';
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

function writeCsv(orders: Order[], outPath: string): void {
  const lines: string[] = [];
  lines.push(CSV_COLUMNS.join(','));
  for (const o of orders) {
    const row = CSV_COLUMNS.map((col) => csvEscape(String(o[col] ?? ''))).join(',');
    lines.push(row);
  }
  fs.writeFileSync(outPath, lines.join('\n') + '\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

function main(): void {
  setSeed(0xc0ffee);

  console.log('[gen] Cohort 1: serial INR claimers');
  genCohort1();
  console.log(`[gen]   ${ALL_ORDERS.length} orders so far`);

  console.log('[gen] Cohort 2: cross-merchant rings');
  genCohort2();
  console.log(`[gen]   ${ALL_ORDERS.length} orders so far`);

  console.log('[gen] Cohort 3: return fraud');
  genCohort3();
  console.log(`[gen]   ${ALL_ORDERS.length} orders so far`);

  console.log('[gen] Cohort 4: chargeback specialists');
  genCohort4();
  console.log(`[gen]   ${ALL_ORDERS.length} orders so far`);

  console.log('[gen] Cohort 5: first-order fraudsters');
  genCohort5();
  console.log(`[gen]   ${ALL_ORDERS.length} orders so far`);

  console.log('[gen] Cohort 7: legitimate-shared traps (needs Cohorts 1-4 done)');
  genCohort7();
  console.log(`[gen]   ${ALL_ORDERS.length} orders so far`);

  console.log('[gen] Cohort 6: legitimate (padded to fill total to 15,000)');
  genCohort6();
  console.log(`[gen]   ${ALL_ORDERS.length} orders so far`);

  // Trim or pad to exact 15,000
  const TARGET = 15000;
  if (ALL_ORDERS.length > TARGET) {
    // Drop excess from end (legitimate one-time orders)
    const dropCount = ALL_ORDERS.length - TARGET;
    const droppedIds = new Set<string>();
    for (let i = 0; i < dropCount; i++) {
      // Find a one-time legitimate from end
      for (let j = ALL_ORDERS.length - 1; j >= 0; j--) {
        const o = ALL_ORDERS[j];
        if (o._cohort === 6 && o._subtype === 'one_time' && !droppedIds.has(o.order_id)) {
          droppedIds.add(o.order_id);
          ALL_ORDERS.splice(j, 1);
          // Also remove cluster
          const cIdx = ALL_CLUSTERS.findIndex((c) => c.cluster_id === o._cluster_id);
          if (cIdx >= 0) ALL_CLUSTERS.splice(cIdx, 1);
          break;
        }
      }
    }
  }
  console.log(`[gen] Final order count: ${ALL_ORDERS.length}`);

  // Shuffle order rows so cohorts aren't grouped (the engine processes them sequentially)
  const shuffled = shuffle(ALL_ORDERS);

  // Counts by merchant for sanity check
  const merchant_a_count = shuffled.filter((o) => o.merchant_id === 'merchant_a').length;
  const merchant_b_count = shuffled.filter((o) => o.merchant_id === 'merchant_b').length;
  console.log(`[gen] merchant_a: ${merchant_a_count}  merchant_b: ${merchant_b_count}`);

  // Counts by ground truth
  const counts: Record<string, number> = {};
  for (const o of shuffled) counts[o.ground_truth_label] = (counts[o.ground_truth_label] || 0) + 1;
  console.log('[gen] Label counts:', counts);

  // Write CSV
  const outDir = path.resolve(__dirname, '../../test-data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const csvPath = path.join(outDir, 'us_benchmark_v1.csv');
  writeCsv(shuffled, csvPath);
  console.log(`[gen] Wrote CSV: ${csvPath}`);

  // Build ground truth JSON
  const cohortBreakdown: Record<string, { orders: number; identities: number }> = {
    cohort_1_serial_inr: { orders: 0, identities: 0 },
    cohort_2_cross_merchant_rings: { orders: 0, identities: 0 },
    cohort_3_return_fraud: { orders: 0, identities: 0 },
    cohort_4_chargeback_specialists: { orders: 0, identities: 0 },
    cohort_5_first_order_fraudsters: { orders: 0, identities: 0 },
    cohort_6_legitimate: { orders: 0, identities: 0 },
    cohort_7_legitimate_shared: { orders: 0, identities: 0 },
  };
  const cohortKey = (c: number) => [
    null,
    'cohort_1_serial_inr',
    'cohort_2_cross_merchant_rings',
    'cohort_3_return_fraud',
    'cohort_4_chargeback_specialists',
    'cohort_5_first_order_fraudsters',
    'cohort_6_legitimate',
    'cohort_7_legitimate_shared',
  ][c]!;
  for (const o of shuffled) cohortBreakdown[cohortKey(o._cohort)].orders++;
  for (const c of ALL_CLUSTERS) cohortBreakdown[cohortKey(c.cohort)].identities++;

  // order_index map
  const orderIndex: Record<string, {
    cohort: number;
    subtype: string;
    cluster_id: string;
    ground_truth_label: string;
    merchant_id: string;
    counts_toward_recall: boolean;
    counts_toward_fpr: boolean;
    ring_id?: string;
    trap_id?: string;
  }> = {};
  for (const o of shuffled) {
    orderIndex[o.order_id] = {
      cohort: o._cohort,
      subtype: o._subtype,
      cluster_id: o._cluster_id,
      ground_truth_label: o.ground_truth_label,
      merchant_id: o.merchant_id,
      counts_toward_recall: o.ground_truth_label === 'FRAUDSTER',
      counts_toward_fpr: o.ground_truth_label === 'LEGITIMATE' || o.ground_truth_label === 'LEGITIMATE_SHARED',
      ...(o._ring_id ? { ring_id: o._ring_id } : {}),
      ...(o._trap_id ? { trap_id: o._trap_id } : {}),
    };
  }

  const groundTruth = {
    meta: {
      total_orders: shuffled.length,
      merchant_a_orders: merchant_a_count,
      merchant_b_orders: merchant_b_count,
      cohort_breakdown: cohortBreakdown,
      recall_denominator: 'FRAUDSTER labels only — SUSPICIOUS excluded',
      false_positive_denominator: 'LEGITIMATE + LEGITIMATE_SHARED labels',
      generated_at: new Date().toISOString(),
      seed: '0xc0ffee',
    },
    fraud_rings: ALL_RINGS,
    identity_clusters: ALL_CLUSTERS,
    false_positive_traps: ALL_TRAPS,
    order_index: orderIndex,
  };

  const gtPath = path.join(outDir, 'us_benchmark_v1_ground_truth.json');
  fs.writeFileSync(gtPath, JSON.stringify(groundTruth, null, 2));
  console.log(`[gen] Wrote ground-truth JSON: ${gtPath}`);
  console.log('[gen] Cohort breakdown:', cohortBreakdown);
  console.log('[gen] Done.');
}

main();
