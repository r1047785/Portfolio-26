import { paintCase } from "./case-art.js";
onmessage = (e) => {
  const maps = paintCase(e.data, (n) => new OffscreenCanvas(n, n));
  const front = maps.front.transferToImageBitmap(), mid = maps.mid.transferToImageBitmap();
  postMessage({ front, mid }, [front, mid]);
};
