/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import CustomerNotes from '@/components/audit/CustomerNotes';
const mockReload=jest.fn();let mockResource:any;
jest.mock('@/lib/react/useFetchJson',()=>({useFetchJson:()=>({...mockResource,reload:mockReload})}));
jest.mock('@/components/ui',()=>({
  Button:({children,loading,...props}:any)=><button {...props} disabled={props.disabled||loading}>{children}</button>,
  Checkbox:(props:any)=><input type="checkbox" {...props}/>,
  Textarea:(props:any)=><textarea {...props}/>,
  Modal:({open,title,children,footer}:any)=>open?<div role="dialog" aria-label={title}>{children}{footer}</div>:null,
}));
beforeEach(()=>{mockReload.mockReset();mockResource={data:{notes:[]},loading:false,error:null};global.fetch=jest.fn();});
test('a lost save response retains the draft, reports uncertainty, and releases the pending guard',async()=>{
  (fetch as jest.Mock).mockRejectedValue(new TypeError('network failed'));render(<CustomerNotes customerProfileId="customer" canAdd/>);fireEvent.click(screen.getByText('Add note'));fireEvent.change(screen.getByLabelText('Note'),{target:{value:'Keep this draft'}});fireEvent.click(screen.getByText('Save note'));
  await expect(screen.findByRole('alert')).resolves.toHaveTextContent('response was lost');expect(screen.getByLabelText('Note')).toHaveValue('Keep this draft');expect(screen.getByText('Save note')).toBeEnabled();expect(mockReload).not.toHaveBeenCalled();expect(fetch).toHaveBeenCalledTimes(1);
});
test('an HTTP denial preserves the draft and does not announce success',async()=>{
  (fetch as jest.Mock).mockResolvedValue({ok:false,json:async()=>({error:'Permission denied'})});render(<CustomerNotes customerProfileId="customer" canAdd/>);fireEvent.click(screen.getByText('Add note'));fireEvent.change(screen.getByLabelText('Note'),{target:{value:'Keep this draft'}});fireEvent.click(screen.getByText('Save note'));await expect(screen.findByRole('alert')).resolves.toHaveTextContent('Permission denied');expect(screen.getByLabelText('Note')).toHaveValue('Keep this draft');expect(mockReload).not.toHaveBeenCalled();
});
test('unavailable notes are not rendered as verified empty and can retry',()=>{
  mockResource={data:undefined,loading:false,error:'unavailable'};render(<CustomerNotes customerProfileId="customer"/>);expect(screen.queryByText(/No notes yet/)).not.toBeInTheDocument();expect(screen.queryByText('Add note')).not.toBeInTheDocument();fireEvent.click(screen.getByText('Retry notes'));expect(mockReload).toHaveBeenCalledTimes(1);
});
test('failed deletion keeps the note and releases its control',async()=>{
  mockResource={data:{notes:[{id:'note',body:'Retain me',created_at:'2026-09-01'}]},loading:false,error:null};jest.spyOn(window,'confirm').mockReturnValue(true);(fetch as jest.Mock).mockRejectedValue(new TypeError('lost'));render(<CustomerNotes customerProfileId="customer" canDelete/>);fireEvent.click(screen.getByTitle('Delete note'));await expect(screen.findByRole('alert')).resolves.toHaveTextContent('delete response was lost');expect(screen.getByText('Retain me')).toBeInTheDocument();await waitFor(()=>expect(screen.getByTitle('Delete note')).toBeEnabled());expect(mockReload).not.toHaveBeenCalled();jest.restoreAllMocks();
});
