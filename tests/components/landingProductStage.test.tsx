/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { LandingProductStage } from '@/components/public/LandingProductStage';

it('keeps authentic capture provenance and an accessible full-size destination when media fails',()=>{
 const storage=jest.spyOn(Storage.prototype,'setItem');
 const {container}=render(<LandingProductStage/>);
 const capture=screen.getByRole('img');
 const src=capture.getAttribute('src');
 expect(src).toMatch(/^\/landing\/asterlane-.*-live-2026-09-23\.(jpg|png)$/);
 expect(screen.getByRole('link',{name:/View full-size image/})).toHaveAttribute('href',src);
 expect(capture).toHaveAttribute('width');
 expect(capture).toHaveAttribute('height');
 fireEvent.error(capture);
 expect(container).toHaveTextContent('fictional demo workspace');
 expect(capture).toHaveAttribute('alt',expect.stringContaining('Asterlane'));
 expect(storage).not.toHaveBeenCalled();storage.mockRestore();
});
