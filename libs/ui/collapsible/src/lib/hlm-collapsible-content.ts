import { Directive } from '@angular/core';
import { BrnCollapsibleContent } from '@spartan-ng/brain/collapsible';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmCollapsibleContent],hlm-collapsible-content',
  exportAs: 'hlmCollapsibleContent',
  hostDirectives: [{ directive: BrnCollapsibleContent, inputs: ['id'] }],
  host: { 'data-slot': 'collapsible-content' },
})
export class HlmCollapsibleContent {
  constructor() {
    classes(
      () =>
        'grid transition-[grid-template-rows,opacity] duration-200 ease-out data-[state=closed]:grid-rows-[0fr] data-[state=closed]:opacity-0 data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100 motion-reduce:transition-none',
    );
  }
}
