import { DOCUMENT } from '@angular/common';
import { ChangeDetectorRef, Directive, ElementRef, inject, Input, OnInit, ViewChild } from '@angular/core';
import { TooltipComponent } from '@angular/material/tooltip';
import { DomSanitizer } from '@angular/platform-browser';

@Directive({
  selector: '[appCustomTooltip]',
  standalone: true,
  inputs: ['customContent', { name: 'customContent', required: true}]
})
export class CustomTooltipDirective implements OnInit {
  #document = inject(DOCUMENT);
  #domSanitizer = inject(DomSanitizer);

  @ViewChild(TooltipComponent)
  readonly tooltipComponent!: TooltipComponent;

  @Input()
  customContent!: string;

  constructor(_changeDetectorRef: ChangeDetectorRef, private readonly _elementRef: ElementRef<HTMLElement>) {
    // super(_changeDetectorRef, _elementRef);
    this.tooltipComponent = new TooltipComponent(_changeDetectorRef, _elementRef);
  }

  ngOnInit(): void {
      if (this.customContent && this.#domSanitizer.bypassSecurityTrustHtml(this.customContent)) {
        const templateElement = this.#document.createElement('template');
        templateElement.innerHTML = this.customContent;
        const result = templateElement.content.children.length === 1 ? templateElement.content.children[0] : templateElement.content.children;
        this.tooltipComponent.message = this.customContent;
        this.tooltipComponent._tooltip.nativeElement.insertAdjacentElement('afterbegin', result as Element);
        // this._elementRef.nativeElement.insertAdjacentElement('afterbegin', result as Element);
      }
  }
}
