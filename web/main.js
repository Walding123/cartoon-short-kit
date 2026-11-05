import { renderFrame, setStory, renderer } from './engine.js';
import { update, TOTAL } from './story.js';
setStory(update);
window.TOTAL = TOTAL;
window.renderFrame = (f) => { renderFrame(f); return true; };
window.grab = (f, qual = 0.93) => { renderFrame(f); return renderer.domElement.toDataURL('image/jpeg', qual); };
window.ready = true;
import * as E from "./engine.js"; window.E = E;
