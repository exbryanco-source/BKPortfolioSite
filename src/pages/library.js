import { bootPage } from '../core/boot.js';
import { initArchive } from '../core/archive.js';

// Library: project archive as an endless horizontal pan. The rail copies are
// built before boot so the shared lazy-image fade picks up every tile.
initArchive();
bootPage();
