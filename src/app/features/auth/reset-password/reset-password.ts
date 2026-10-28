import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: '../auth-form.css',
})
export class ResetPassword {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly hasToken = computed(() => !!this.queryParams().get('token')?.trim());
  protected readonly showPasswords = signal(false);
  protected readonly submitted = signal(false);
  protected readonly form = this.formBuilder.nonNullable.group({
    password: ['', Validators.required],
    confirmPassword: ['', Validators.required],
  });

  protected get passwordsDoNotMatch(): boolean {
    return this.form.controls.confirmPassword.touched &&
      !!this.form.controls.confirmPassword.value &&
      this.form.controls.password.value !== this.form.controls.confirmPassword.value;
  }

  protected togglePasswordVisibility(): void {
    this.showPasswords.update((visible) => !visible);
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (!this.hasToken() || this.form.invalid || this.passwordsDoNotMatch) {
      return;
    }

    this.submitted.set(true);
  }
}
