import type {
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap
} from "baileys";
import { BufferJSON, initAuthCreds } from "baileys";
import Whatsapp from "../models/Whatsapp";

const KEY_MAP: { [T in keyof SignalDataTypeMap]: string } = {
  "pre-key": "preKeys",
  session: "sessions",
  "sender-key": "senderKeys",
  "sender-key-memory": "senderKeyMemory",
  "app-state-sync-key": "appStateSyncKeys",
  "app-state-sync-version": "appStateVersions",
  "lid-mapping": "lidMapping",
  "device-list": "deviceList" // ✅ nova entrada exigida na v7
};

const authState = async (
  whatsapp: Whatsapp
): Promise<{ state: AuthenticationState; saveState: () => void }> => {
  let creds: AuthenticationCreds;
  let keys: any = {};

  const saveState = async () => {
    try {
      await whatsapp.update({
        session: JSON.stringify({ creds, keys }, BufferJSON.replacer, 0)
      });
    } catch (error) {
      console.log(error);
    }
  };

  if (whatsapp.session && whatsapp.session !== null) {
    const result = JSON.parse(whatsapp.session, BufferJSON.reviver);
    creds = result.creds;
    keys = result.keys;
  } else {
    creds = initAuthCreds();
    keys = {};
  }

  return {
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const key = KEY_MAP[type];
          return ids.reduce((dict: any, id) => {
            const value = keys[key]?.[id];
            if (value) {
              dict[id] = value;
            }
            return dict;
          }, {});
        },
        set: (data: any) => {
          for (const i in data) {
            const key = KEY_MAP[i as keyof SignalDataTypeMap];
            keys[key] = keys[key] || {};
            Object.assign(keys[key], data[i]);
          }
          saveState();
        }
      }
    },
    saveState
  };
};

export default authState;
