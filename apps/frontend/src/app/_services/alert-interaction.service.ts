import { Injectable } from '@angular/core';
import { NgToastService } from 'ng-angular-popup';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AlertInteractionService {
  readonly isLoadingSpinnerActive$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(private readonly ngToastService: NgToastService) { }

  selectLoadingSpinnerChanged(): Observable<boolean> {
    return this.isLoadingSpinnerActive$.asObservable();
  }

  error(message: string): void {
    this.ngToastService.danger(message);
  }
}
