// ===== 寶島富翁 3D：連線層（MQTT 公共伺服器 / 同瀏覽器 BroadcastChannel）=====
export const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
];
const BASE = 'twrichman3d/v1/';

export class MqttNet {
  constructor(room, brokerIdx, myId) { this.room = room; this.bi = brokerIdx; this.myId = myId; this.h = {}; this.status = 'idle'; }
  on(k, f) { this.h[k] = f; }
  connect(timeout = 8000) {
    return new Promise((res, rej) => {
      if (!window.mqtt) return rej(new Error('連線元件載入失敗'));
      const c = this.c = window.mqtt.connect(BROKERS[this.bi], {
        clientId: 'tr3d_' + this.myId + '_' + Math.random().toString(36).slice(2, 7),
        clean: true, keepalive: 25, reconnectPeriod: 2000, connectTimeout: timeout,
      });
      let first = true;
      const to = setTimeout(() => { if (first) { first = false; try { c.end(true); } catch (e) {} rej(new Error('連線逾時')); } }, timeout + 500);
      c.on('connect', () => {
        this.status = 'ok'; this.h.status?.('ok');
        c.subscribe(BASE + this.room + '/#', { qos: 1 }, () => {
          if (first) { first = false; clearTimeout(to); res(); }
          this.h.ready?.();
        });
      });
      c.on('reconnect', () => { this.status = 'reconnecting'; this.h.status?.('reconnecting'); });
      c.on('offline', () => { this.status = 'offline'; this.h.status?.('offline'); });
      c.on('error', e => { if (first) { first = false; clearTimeout(to); rej(e); } });
      c.on('message', (topic, payload) => {
        const k = topic.slice((BASE + this.room + '/').length);
        let m; try { m = JSON.parse(new TextDecoder().decode(payload)); } catch (e) { return; }
        if (k.startsWith('av/')) this.h.av?.(m); else this.h[k]?.(m);
      });
    });
  }
  pub(k, obj, retain = false) {
    if (!this.c || !this.c.connected) return;
    this.c.publish(BASE + this.room + '/' + k, JSON.stringify(obj), { qos: k === 'hi' ? 0 : 1, retain });
  }
  close() { try { this.c && this.c.end(true); } catch (e) {} }
}

// 測試用：同一個瀏覽器的多個分頁
export class LocalNet {
  constructor(room) { this.room = room; this.h = {}; this.status = 'ok'; }
  on(k, f) { this.h[k] = f; }
  connect() {
    this.bc = new BroadcastChannel('tr3d-' + this.room);
    this.bc.onmessage = e => { const { k, m } = e.data; if (k.startsWith('av/')) this.h.av?.(m); else this.h[k]?.(m); };
    setTimeout(() => this.h.ready?.(), 50);
    return Promise.resolve();
  }
  pub(k, obj) { this.bc.postMessage({ k, m: obj }); }
  close() { this.bc && this.bc.close(); }
}
