import { bootPage } from '../core/boot.js';
import { initArchive } from '../core/archive.js';

// Library: project archive as an endless horizontal pan. The rail copies are
// built before boot so the shared lazy-image fade picks up every tile. The
// loader waits for the first screen of tiles, which then reveal left to right.
const archive = initArchive();
bootPage({ load: (loader) => archive?.ready(loader) }).then(() => archive?.reveal());
