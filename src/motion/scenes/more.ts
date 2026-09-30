import { registerScene } from '../registry';
import { enableTilt } from '../tilt';

registerScene('more', (root, { mode }) => {
  if (mode !== 'full') return;
  return enableTilt(root);
});
