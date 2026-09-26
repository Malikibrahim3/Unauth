# Sample product thumbnail register

These small catalogue images belong only to the isolated public sample cases.
They are generated fictional product depictions, not merchant catalogue records,
source evidence, or proof of the item shipped or received.

| Asset | Sample item and SKU | Used by |
| --- | --- | --- |
| `public/demo/items/wool-coat.jpg` | Wool coat, COAT-01 | SAMPLE-NR248 and SAMPLE-248 |
| `public/demo/items/ceramic-bowl.jpg` | Ceramic serving bowl, BOWL-01 | SAMPLE-096 |
| `public/demo/items/canvas-jacket.jpg` | Canvas jacket, JACKET-01 | SAMPLE-128 |

Each is an original generated studio-style product image, reduced to 256px square
and JPEG quality 80 for a 44–48px interface placement. Mapping is owned by
`lib/demo/merchantCaseV1.ts`. Live order lines show a thumbnail only when their
own retained metadata supplies a safe image URL; no fallback product image is
inferred from the item name or category.

## Fictional evidence images

| Asset | Exact sample evidence | Used by |
| --- | --- | --- |
| `public/demo/evidence/wrong-item-packing.jpg` | Example warehouse packing photo showing a different garment in the parcel | SAMPLE-248 landing case summary and evidence detail |
| `public/demo/evidence/damaged-bowl.jpg` | Example customer damage photo based on the same ivory bowl as the catalogue image | SAMPLE-096 landing case summary and evidence detail |

Both were generated for these isolated fictional cases and reduced to 320px
JPEGs. `DEMO_EVIDENCE_VISUALS` owns their case mapping. The not-received carrier
investigation and agreement are expressed as source facts without document
thumbnails. The duplicate refund record retains its code-native label. No
sample image is used as evidence for a live merchant case.
