import { Injectable } from '@angular/core';
import { AppLang, AppTheme } from '../typings/common';

type LocalStorageKey = 'theme' | 'lang';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  constructor() { }

  setItem<T extends LocalStorageKey = 'theme'>(key: LocalStorageKey, value: T extends 'theme' ? AppTheme : AppLang): void {
    localStorage.setItem(key, value);
  }

  getItem<T extends LocalStorageKey = 'theme'>(key: LocalStorageKey): (T extends 'theme' ? AppTheme : AppLang) | null {
    return localStorage.getItem(key) as (T extends 'theme' ? AppTheme : AppLang) | null;
  }
}
