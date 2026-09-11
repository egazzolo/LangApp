import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn(),
  getSession: vi.fn(), signOut: vi.fn(), reset: vi.fn(), setState: vi.fn(), prune: vi.fn(),
}));
vi.mock('@react-native-async-storage/async-storage', () => ({default: {setItem:mocks.setItem,getItem:mocks.getItem,removeItem:mocks.removeItem}}));
vi.mock('@/services/supabase/client', () => ({supabase:{auth:{getSession:mocks.getSession,signOut:mocks.signOut}}}));
vi.mock('@/store/app-store', () => ({useAppStore:{getState:()=>({resetForSignOut:mocks.reset,purgeExpiredConversations:mocks.prune}),setState:mocks.setState,persist:{getOptions:()=>({partialize:()=>({characters:[{id:'person'}],messages:{chat:[{text:'kept'}]}})})}}}));
import { signOutSafely, restoreSignedInAccount } from '../src/services/auth/sign-out';
beforeEach(()=>{vi.resetAllMocks();mocks.getSession.mockResolvedValue({data:{session:{user:{id:'account-a'}}},error:null});mocks.signOut.mockResolvedValue({error:null});});
describe('safe sign out',()=>{
  it('backs up to the account key before ending the session and clearing active data',async()=>{
    await signOutSafely();
    expect(mocks.setItem).toHaveBeenCalledWith('ferson-account-state-v1:account-a',expect.stringContaining('kept'));
    expect(mocks.signOut).toHaveBeenCalledWith({scope:'local'});
    expect(mocks.setItem.mock.invocationCallOrder[0]!).toBeLessThan(mocks.signOut.mock.invocationCallOrder[0]!);
    expect(mocks.signOut.mock.invocationCallOrder[0]!).toBeLessThan(mocks.reset.mock.invocationCallOrder[0]!);
  });
  it('keeps active data and session when saving fails',async()=>{
    mocks.setItem.mockRejectedValue(new Error('disk full'));
    await expect(signOutSafely()).rejects.toThrow('disk full');
    expect(mocks.signOut).not.toHaveBeenCalled();expect(mocks.reset).not.toHaveBeenCalled();
  });
  it('keeps active data when auth rejects sign out',async()=>{
    mocks.signOut.mockResolvedValue({error:new Error('offline')});
    await expect(signOutSafely()).rejects.toThrow('offline');expect(mocks.reset).not.toHaveBeenCalled();
  });
  it('restores only the signed-in account backup and applies retention',async()=>{
    mocks.getItem.mockResolvedValue(JSON.stringify({messages:{chat:[]}}));
    await restoreSignedInAccount();
    expect(mocks.getItem).toHaveBeenCalledWith('ferson-account-state-v1:account-a');
    expect(mocks.setState).toHaveBeenCalledWith({messages:{chat:[]}});expect(mocks.prune).toHaveBeenCalled();
    expect(mocks.removeItem).toHaveBeenCalledWith('ferson-account-state-v1:account-a');
  });
});
