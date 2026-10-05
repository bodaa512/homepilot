import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** الجذر اللي index.html بيستدعيه: <hp-root>. أي شاشة تانية بتتحمّل من الراوتر. */
@Component({
  selector: 'hp-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class RootComponent {}
