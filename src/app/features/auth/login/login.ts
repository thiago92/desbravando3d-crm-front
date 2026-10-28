import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: '../auth-form.css',
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);

  protected readonly showPassword = signal(false);
  protected readonly statusMessage = signal('');
  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected submit(): void {
    this.statusMessage.set('');
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.statusMessage.set('O acesso ainda está em preparação. Seus dados não foram enviados.');
  }
}
