"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// RM Devices (without RF support)
const supportedDevices = {};
exports.supportedDevices = supportedDevices;
supportedDevices[0x2737] = 'Broadlink RM Mini';
supportedDevices[0x27c7] = 'Broadlink RM Mini 3 A';
supportedDevices[0x27c2] = 'Broadlink RM Mini 3 B';
supportedDevices[0x27de] = 'Broadlink RM Mini 3 C';
supportedDevices[0x5f36] = 'Broadlink RM Mini 3 D';
supportedDevices[0x273d] = 'Broadlink RM Pro Phicomm';
supportedDevices[0x2712] = 'Broadlink RM2';
supportedDevices[0x2783] = 'Broadlink RM2 Home Plus';
supportedDevices[0x277c] = 'Broadlink RM2 Home Plus GDT';
supportedDevices[0x278f] = 'Broadlink RM Mini Shate';
// RM Devices (with RF support)
const rfSupportedDevices = {};
exports.rfSupportedDevices = rfSupportedDevices;
rfSupportedDevices[0x272a] = 'Broadlink RM2 Pro Plus';
rfSupportedDevices[0x2787] = 'Broadlink RM2 Pro Plus v2';
rfSupportedDevices[0x278b] = 'Broadlink RM2 Pro Plus BL';
rfSupportedDevices[0x2797] = 'Broadlink RM2 Pro Plus HYC';
rfSupportedDevices[0x27a1] = 'Broadlink RM2 Pro Plus R1';
rfSupportedDevices[0x27a6] = 'Broadlink RM2 Pro PP';
rfSupportedDevices[0x279d] = 'Broadlink RM3 Pro Plus';
rfSupportedDevices[0x27a9] = 'Broadlink RM3 Pro Plus v2'; // (model RM 3422)
rfSupportedDevices[0x27c3] = 'Broadlink RM3 Pro';
// Known Unsupported Devices
const unsupportedDevices = {};
exports.unsupportedDevices = unsupportedDevices;
unsupportedDevices[0] = 'Broadlink SP1';
unsupportedDevices[0x2711] = 'Broadlink SP2';
unsupportedDevices[0x2719] = 'Honeywell SP2';
unsupportedDevices[0x7919] = 'Honeywell SP2';
unsupportedDevices[0x271a] = 'Honeywell SP2';
unsupportedDevices[0x791a] = 'Honeywell SP2';
unsupportedDevices[0x2733] = 'OEM Branded SP Mini';
unsupportedDevices[0x273e] = 'OEM Branded SP Mini';
unsupportedDevices[0x2720] = 'Broadlink SP Mini';
unsupportedDevices[0x7d07] = 'Broadlink SP Mini';
unsupportedDevices[0x753e] = 'Broadlink SP 3';
unsupportedDevices[0x2728] = 'Broadlink SPMini 2';
unsupportedDevices[0x2736] = 'Broadlink SPMini Plus';
unsupportedDevices[0x2714] = 'Broadlink A1';
unsupportedDevices[0x4eb5] = 'Broadlink MP1';
unsupportedDevices[0x2722] = 'Broadlink S1 (SmartOne Alarm Kit)';
unsupportedDevices[0x4e4d] = 'Dooya DT360E (DOOYA_CURTAIN_V2) or Hysen Heating Controller';
unsupportedDevices[0x4ead] = 'Dooya DT360E (DOOYA_CURTAIN_V2) or Hysen Heating Controller';
unsupportedDevices[0x947a] = 'BroadLink Outlet';
//# sourceMappingURL=deviceTypes.js.map