import { Provider, forwardRef, signal, Type } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export function provideValueAccessor(type: () => Type<unknown>): Provider {
  return { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(type), multi: true };
}

export abstract class ValueControl<T> implements ControlValueAccessor {
  readonly value = signal<T>(this.emptyValue());
  readonly disabled = signal(false);

  private onChange: (value: T) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  protected abstract emptyValue(): T;

  writeValue(value: T | null): void {
    this.value.set(value ?? this.emptyValue());
  }

  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected commit(value: T): void {
    this.value.set(value);
    this.onChange(value);
  }
}
