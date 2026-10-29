import { Component } from '@angular/core';
import { HlmSidebarTrigger } from '@spartan-ng/helm/sidebar';

@Component({
  selector: 'app-top-bar',
  imports: [HlmSidebarTrigger],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.css',
})
export class TopBar {}
