import {describe,it,expect} from 'vitest';
import {resolveVoiceAccent,speechInstructions} from '../supabase/functions/_shared/voice-accents';
import {entitlements} from '../src/config/entitlements';
describe('neutral American English voice policy',()=>{
 it.each([false,true])('applies to premium=%s despite origins and legacy preferences',premium=>{
  for(const c of [{gender:'woman',location:'Londres',countryCode:'US',voiceAccent:'british'},{gender:'man',location:'Lagos',countryCode:'NG',voiceAccent:'nigerian'}]){
   expect(resolveVoiceAccent(premium,c)).toBe('general-american');
   const instructions=speechInstructions(premium,c,'en');
   expect(instructions).toContain('neutral General American');
   expect(instructions).not.toContain('London');
   expect(instructions).not.toContain('Nigerian');
  }
 });
 it('preserves female identity and natural delivery',()=>{
  const text=speechInstructions(true,{gender:'woman'},'en');
  expect(text).toContain('adult female');expect(text).toContain('Avoid robotic cadence');
 });
 it('preserves Spanish pronunciation instead of applying an American English accent',()=>{
  expect(speechInstructions(true,{},'es','castilian-spanish')).toContain('standard pronunciation from Spain');
  expect(speechInstructions(false,{},'es')).toContain('Latin American Spanish');
  expect(speechInstructions(true,{},'es')).not.toContain('General American');
 });
 it('does not advertise regional accents as a paid entitlement',()=>{
  expect(entitlements.free.regionalAccents).toBe(false);
  expect(entitlements.premium_monthly.regionalAccents).toBe(false);
  expect(entitlements.premium_annual.regionalAccents).toBe(false);
 });
});
