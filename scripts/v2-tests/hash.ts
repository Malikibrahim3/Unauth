/** prints hashIdentifier(argv[2]) — canonical HMAC for shell scripts */
import { hashIdentifier } from '../../lib/identity/hash';
console.log(hashIdentifier(process.argv[2]));
