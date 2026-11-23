import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';

@Component({
  selector: 'app-login',
  imports: [HlmButton, HlmInput, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: '../auth-form.css',
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly showPassword = signal(false);
  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    void this.router.navigateByUrl('/inicio');
  }
}
