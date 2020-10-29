import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { DOCUMENT } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChildren, ElementRef, EventEmitter, forwardRef, HostBinding, HostListener, Inject, Input, Output, QueryList, Renderer2, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { animationFrameScheduler, fromEvent, Subscription } from 'rxjs';
import { map, startWith, subscribeOn, takeUntil } from 'rxjs/operators';
import { SwitchItemComponent } from './switch-item';

@Component({
  selector: 'app-multi-switch',
  templateUrl: './multi-switch.html',
  styleUrls: ['./multi-switch.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiSwitchComponent),
      multi: true,
    }
  ]
})
export class MultiSwitchComponent<T> implements AfterViewInit, ControlValueAccessor {
  /** Subscription to all button-select changes */
  private sub = Subscription.EMPTY;

  /** Holds the current x-translation offset for the marker */
  private markerOffset: number = 0;

  /** All buttons projected into the multi-switch */
  @ContentChildren(SwitchItemComponent)
  buttons: QueryList<SwitchItemComponent<T>> | null = null;

  /** Emits whenever the selected button changes. */
  @Output()
  changed = new EventEmitter<T>();

  /** Reference to the marker inside our view container */
  @ViewChild('marker', { read: ElementRef, static: true })
  marker: ElementRef | null = null;

  @HostListener('blur')
  onBlur() {
    this._onTouch();
  }

  /** Whether or not the switch button component is disabled */
  @Input()
  @HostBinding('class.disabled')
  set disabled(v: any) {
    this._disabled = coerceBooleanProperty(v);

    // Update all buttons states as well.
    if (!!this.buttons) {
      this.buttons.forEach(btn => btn.disabled = this.disabled);
    }
  }
  get disabled() { return this._disabled; }
  private _disabled = false;

  /** Which button is currently active (and holds the marker) */
  activeButton: T | null = null;

  constructor(
    public host: ElementRef,
    private changeDetectorRef: ChangeDetectorRef,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
  ) { }

  /** Registeres the change callback. Required for ControlValueAccessor */
  registerOnChange(fn: (v: T) => void) {
    this._onChange = fn;
  }
  private _onChange: (value: T) => void = () => { }

  /** Registers the touch callback. Required for ControlValueAccessor */
  registerOnTouched(fn: () => void) {
    this._onTouch = fn;
  }
  private _onTouch: () => void = () => { };

  /** Disable or enable the button. Required for ControlValueAccessor */
  setDisabledState(disabled: boolean) {
    this.disabled = disabled;
  }

  /** Writes a new value for the multi-line switch */
  writeValue(value: T) {
    this.activeButton = value;

    if (!!this.buttons) {
      this.buttons.forEach(btn => {
        if (btn.id === value) {
          this.selectButton(btn, false);
          this.repositionMarker(btn);
        }
      })
    }
  }

  ngAfterViewInit() {
    if (!this.buttons) {
      return;
    }

    // Subscribe to all (clicked) and (selectedChange) events of
    // all buttons projected into our content.
    this.buttons.changes
      .pipe(startWith(null))
      .subscribe(() => {
        this.sub.unsubscribe();
        this.sub = new Subscription();

        this.buttons!.forEach(btn => {
          btn.disabled = this.disabled;
          this.sub.add(
            btn.clicked.subscribe((e: MouseEvent) => this.selectButton(btn, true))
          );
        })
      });

    this.buttons.forEach(btn => {
      if (this.activeButton === btn.id) {
        btn.selected = true;
      }
    })

    this.repositionMarker();
  }

  /** Selects a new button and deselects all others. */
  private selectButton(btn: SwitchItemComponent<T>, emit = true) {
    if (this.disabled) {
      return;
    }

    this.activeButton = btn.id;

    if (emit) {
      this.changed.next(btn.id!);
      this._onChange(btn.id!);
    }

    this.repositionMarker(btn);
  }

  /** @private View-callback for (mousedown) to start dragging the marker. */
  dragStarted(event: MouseEvent) {
    if (this.disabled) {
      return;
    }

    const mousemove$ = fromEvent<MouseEvent>(this.document, 'mousemove');
    const hostRect = this.host.nativeElement.getBoundingClientRect();
    const start = this.markerOffset;
    const markerWidth = this.marker!.nativeElement.getBoundingClientRect().width;

    // we don't want angular to run change detection all the time we move a pixel
    // so detach the change-detector for now.
    this.changeDetectorRef.detach();

    mousemove$
      .pipe(
        map(move => {
          move.preventDefault();
          return move.clientX - event.clientX;
        }),
        takeUntil(fromEvent(document, 'mouseup')),
        subscribeOn(animationFrameScheduler)
      )
      .subscribe({
        next: diff => {
          // clip the new offset inside our host-view.
          let offset = start + diff;
          if (offset < 0) {
            offset = 0;
          } else if (offset > hostRect.width) {
            offset = hostRect.width;
          }

          // center the marker at the mouse position.
          offset -= Math.round(markerWidth / 2);

          this.markerOffset = offset;
          this.updatePosition(offset);

          let foundTarget = false;
          let target = this.findTargetButton(offset);

          if (!!target) {
            this.marker!.nativeElement.style.backgroundColor = target.borderColorActive;

            this.buttons!.forEach(btn => {
              if (!foundTarget && btn.group === target!.group) {
                this.renderer.addClass(btn.elementRef.nativeElement, 'selected');
                btn.elementRef.nativeElement.style.borderColor = btn.borderColorActive;
              } else {
                this.renderer.removeClass(btn.elementRef.nativeElement, 'selected');
                btn.elementRef.nativeElement.style.borderColor = btn.borderColorInactive;
              }

              if (target === btn) {
                foundTarget = true;
              }
            });
          }
        },
        complete: () => {
          this.changeDetectorRef.reattach();
          this.markerDropped();

          // make sure we don't keep the selected class on buttons that
          // are not selected anymore.
          this.buttons!.forEach(btn => {
            if (!btn.selected) {
              this.renderer.removeClass(btn.elementRef.nativeElement, 'selected');
              btn.elementRef.nativeElement.style.borderColor = btn.borderColorInactive;
            }
          });
        }
      });
  }

  /** Update the markers position by applying a translate3d */
  private updatePosition(x: number) {
    this.marker!.nativeElement.style.transform = `translate3d(${x}px, 0px, 0px)`;
  }

  /** Find the button item that is below x */
  private findTargetButton(x: number, cb?: (item: SwitchItemComponent<T>, target: boolean) => void): SwitchItemComponent<T> | null {
    const host = this.host.nativeElement.getBoundingClientRect();
    let newButton: SwitchItemComponent<T> | null = null;
    this.buttons?.forEach(btn => {
      const btnRect = btn.elementRef.nativeElement.getBoundingClientRect();
      const min = btnRect.x - host.x;
      const max = min + btnRect.width;

      if (x >= min && x <= max) {
        newButton = btn;

        if (!!cb) {
          cb(btn, true);
        }
      } else if (!!cb) {
        cb(btn, false);
      }
    });

    return newButton;
  }

  /** Calculates which button should be activated based on the drop-position of the marker */
  private markerDropped() {
    let newButton = this.findTargetButton(this.markerOffset);

    if (!newButton) {
      newButton = Array.from(this.buttons!)[0];
    }

    if (!!newButton) {
      this.selectButton(newButton, true);

      this.repositionMarker(newButton);
    }
  }

  /**
   * Calculates the new position required to center the
   * marker at the currently selected button.
   * If `selected` is unset the last button with selected == true is
   * used.
   *
   * @param selected The switch item button to select (optional).
   */
  private repositionMarker(selected: SwitchItemComponent<T> | null = null) {
    // If there's no selected button given search for the last one that
    // matches selected === true.
    if (selected === null) {
      this.buttons?.forEach(btn => {
        if (btn.selected) {
          selected = btn;
        }
      });
    }

    // There's not button selected so we move the marker back to the
    // start.
    if (selected === null) {
      this.markerOffset = 0;
      this.updatePosition(0);
      return;
    }

    // Calculate and reposition the marker.
    const offsetLeft = selected!.elementRef.nativeElement.offsetLeft;
    const clientWidth = selected!.elementRef.nativeElement.clientWidth;

    this.markerOffset = Math.round(offsetLeft - 8 + clientWidth / 2);
    this.marker!.nativeElement.style.backgroundColor = selected.borderColorActive;

    this.updatePosition(this.markerOffset);
    this.changeDetectorRef.markForCheck();
  }
}
