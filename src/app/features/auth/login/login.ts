import { HlmButton } from '@spartan-ng/helm/button';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [HlmButton, RouterLink],
  templateUrl: './login.html',
  styleUrl: '../auth-form.css',
})
export class Login {}
