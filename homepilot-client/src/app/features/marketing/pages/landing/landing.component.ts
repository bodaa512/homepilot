import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

/** نقطة على مخطط البيت: جهاز وحالته. */
interface Pin {
  x: number;
  y: number;
  state: 'ok' | 'due' | 'late' | 'info';
  title: string;
  note: string;
  /** إحداثيات صندوق النص وطرف الخط الواصل. */
  boxX: number;
  boxY: number;
  boxW: number;
  lineTo: { x: number; y: number };
}

@Component({
  selector: 'hp-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <header class="hero">
      <div class="hero__inner">
        <nav class="topnav" aria-label="روابط الموقع">
          <a class="brand" routerLink="/">
            <span class="brand__mark"><i></i></span>
            HomePilot
          </a>
          <a class="topnav__link" href="#features">المميزات</a>
          <a class="topnav__link" href="#how">إزاي بيشتغل</a>
          <a class="topnav__link" routerLink="/auth/provider">لمقدّمي الخدمة</a>
          <span class="hp-spacer"></span>
          <a class="topnav__link" routerLink="/auth/login">دخول</a>
          <a class="hp-btn hp-btn--sm btn-outline" routerLink="/auth/register">ابدأ مجانًا</a>
        </nav>

        <div class="hero__copy">
          <p class="hero__kicker">ملف بيتك كامل في مكان واحد</p>
          <h1>بيتك بيقولّك محتاج إيه <em>قبل</em> ما حاجة تقع.</h1>
          <p class="hero__lede">
            سجّل أجهزتك وضماناتك وفواتيرك مرة واحدة، وHomePilot يفكّرك بالصيانة في ميعادها،
            ويحسبلك المصاريف، ويلاقيلك فني موثوق لما تحتاج.
          </p>
          <div class="hero__cta">
            <a class="hp-btn hp-btn--accent hp-btn--lg" routerLink="/auth/register">افتح ملف بيتك</a>
            <a class="hp-btn hp-btn--lg btn-outline" href="#how">شوف إزاي بيشتغل</a>
          </div>

          <dl class="hero__stats">
            <div><dt>٢٤</dt><dd>جهاز متابَع في البيت المتوسط</dd></div>
            <div><dt>٣١٪</dt><dd>توفير في تكلفة الأعطال المفاجئة</dd></div>
            <div><dt>٨ دقايق</dt><dd>متوسط وقت تجهيز الملف</dd></div>
          </dl>
        </div>

        <!-- البطل: مخطط الشقة والأجهزة عليه بحالتها -->
        <figure class="schematic">
          <svg viewBox="0 0 560 400" role="img" aria-label="مخطط شقة موضّح عليه حالة كل جهاز">
            <path class="wall" d="M40 96 L280 24 L520 96 L520 372 L40 372 Z" />
            <path class="dim" d="M40 96 L520 96" />

            <g class="rooms">
              <rect x="56" y="112" width="180" height="120" rx="2" />
              <rect x="248" y="112" width="130" height="120" rx="2" />
              <rect x="390" y="112" width="114" height="120" rx="2" />
              <rect x="56" y="246" width="150" height="112" rx="2" />
              <rect x="218" y="246" width="160" height="112" rx="2" />
              <rect x="390" y="246" width="114" height="112" rx="2" />
            </g>

            <g class="room-labels">
              <text x="226" y="132" text-anchor="end">الصالة</text>
              <text x="368" y="132" text-anchor="end">المطبخ</text>
              <text x="494" y="132" text-anchor="end">حمّام</text>
              <text x="196" y="266" text-anchor="end">نوم ١</text>
              <text x="368" y="266" text-anchor="end">نوم ٢</text>
              <text x="494" y="266" text-anchor="end">بلكونة</text>
            </g>

            <g
              class="pin"
              *ngFor="let pin of pins; let i = index"
              [class.pin--alert]="pin.state === 'late' || pin.state === 'due'"
              [style.--delay]="200 + i * 180 + 'ms'"
            >
              <circle
                class="pin__pulse"
                *ngIf="pin.state === 'late' || pin.state === 'due'"
                [attr.cx]="pin.x"
                [attr.cy]="pin.y"
                r="7"
                [attr.fill]="color(pin.state)"
              />
              <circle class="pin__dot" [attr.cx]="pin.x" [attr.cy]="pin.y" r="6.5" [attr.fill]="color(pin.state)" />
              <path
                class="pin__leader"
                [attr.d]="'M' + pin.x + ' ' + pin.y + ' L' + pin.lineTo.x + ' ' + pin.lineTo.y"
                [attr.stroke]="color(pin.state)"
              />
              <g class="pin__tag">
                <rect
                  [attr.x]="pin.boxX"
                  [attr.y]="pin.boxY"
                  [attr.width]="pin.boxW"
                  height="32"
                  rx="6"
                  [attr.fill]="tagFill(pin.state)"
                  [attr.stroke]="color(pin.state)"
                />
                <text [attr.x]="pin.boxX + pin.boxW - 14" [attr.y]="pin.boxY + 14" text-anchor="end" [attr.fill]="color(pin.state)">
                  {{ pin.title }}
                </text>
                <text
                  class="pin__note"
                  [attr.x]="pin.boxX + pin.boxW - 14"
                  [attr.y]="pin.boxY + 26"
                  text-anchor="end"
                >
                  {{ pin.note }}
                </text>
              </g>
            </g>
          </svg>
          <figcaption>كل جهاز في مكانه، وحالته واضحة من نظرة واحدة</figcaption>
        </figure>
      </div>

      <div class="features" id="features">
        <article class="feature" *ngFor="let feature of features">
          <span class="feature__icon" [innerHTML]="feature.icon"></span>
          <h2>{{ feature.title }}</h2>
          <p>{{ feature.body }}</p>
        </article>
      </div>
    </header>

    <section class="how" id="how">
      <div class="hp-container">
        <h2 class="how__title">من التسجيل لأول تنبيه — تلات خطوات</h2>
        <!-- الترقيم هنا مقصود: دي خطوات بالترتيب فعلًا -->
        <ol class="steps">
          <li *ngFor="let step of steps; let i = index">
            <span class="steps__num">{{ i + 1 }}</span>
            <h3>{{ step.title }}</h3>
            <p>{{ step.body }}</p>
          </li>
        </ol>
      </div>
    </section>

    <section class="closer">
      <div class="hp-container closer__inner">
        <div>
          <h2>ابدأ بجهاز واحد.</h2>
          <p>سجّل التكييف أو السخّان دلوقتي، وهنفكّرك بأول صيانة في ميعادها.</p>
        </div>
        <a class="hp-btn hp-btn--accent hp-btn--lg" routerLink="/auth/register">أضف أول جهاز</a>
      </div>
    </section>

    <footer class="foot">
      <div class="hp-container foot__inner">
        <span>HomePilot — نظام التشغيل الرقمي لمنزلك</span>
        <nav class="foot__links">
          <a routerLink="/auth/login">دخول</a>
          <a href="#features">المميزات</a>
          <a href="#how">إزاي بيشتغل</a>
        </nav>
      </div>
    </footer>
  `,
  styles: [
    `
      :host { display: block; background: var(--hp-bg); }

      /* ------------------------------ الهيرو ------------------------------ */
      .hero {
        position: relative;
        background: var(--hp-navy-700);
        color: #eaf0fa;
        overflow: hidden;
      }
      /* شبكة مخطط هندسي خفيفة — بتتلاشى في النص عشان متزحمش النص */
      .hero::before {
        content: '';
        position: absolute;
        inset: 0;
        opacity: 0.5;
        background-image:
          linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
        background-size: 34px 34px;
        -webkit-mask-image: radial-gradient(120% 90% at 82% 30%, #000 25%, transparent 78%);
        mask-image: radial-gradient(120% 90% at 82% 30%, #000 25%, transparent 78%);
        pointer-events: none;
      }

      .hero__inner {
        position: relative;
        width: 100%;
        max-width: var(--hp-content-max);
        margin-inline: auto;
        padding: var(--hp-space-6) var(--hp-space-6) var(--hp-space-10);
        display: grid;
        grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.14fr);
        gap: var(--hp-space-10);
        align-items: center;
      }

      .topnav {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        gap: var(--hp-space-6);
        padding-bottom: var(--hp-space-8);
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 9px;
        font-weight: var(--hp-weight-semi);
        font-size: var(--hp-text-sm);
        color: #fff;
        text-decoration: none;
      }
      .brand__mark {
        width: 26px;
        height: 26px;
        border-radius: 7px;
        background: rgba(255, 255, 255, 0.12);
        display: grid;
        place-items: center;
      }
      .brand__mark i {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--hp-ok);
        box-shadow: 0 0 0 3px rgba(28, 138, 107, 0.3);
      }
      .topnav__link { font-size: var(--hp-text-sm); color: #a9bad4; text-decoration: none; }
      .topnav__link:hover { color: #fff; text-decoration: none; }

      .btn-outline {
        background: transparent;
        color: #dce5f3;
        border: 1px solid rgba(255, 255, 255, 0.26);
      }
      .btn-outline:hover { border-color: rgba(255, 255, 255, 0.55); }

      .hero__kicker { font-size: var(--hp-text-sm); color: #8fa6c6; margin-bottom: var(--hp-space-4); }
      .hero h1 {
        font-size: var(--hp-text-3xl);
        font-weight: var(--hp-weight-semi);
        letter-spacing: -0.03em;
        line-height: 1.14;
        color: #fff;
      }
      /* الكلمة الوحيدة الملوّنة في الصفحة — لأنها هي المعنى نفسه */
      .hero h1 em { font-style: normal; color: var(--hp-accent); }

      .hero__lede {
        margin-top: var(--hp-space-4);
        font-size: var(--hp-text-md);
        font-weight: var(--hp-weight-light);
        line-height: var(--hp-leading-loose);
        color: #b9c7dd;
        max-width: 44ch;
      }
      .hero__cta { display: flex; gap: var(--hp-space-3); margin-top: var(--hp-space-6); flex-wrap: wrap; }

      .hero__stats {
        display: flex;
        gap: var(--hp-space-8);
        margin: var(--hp-space-10) 0 0;
        padding-top: var(--hp-space-5);
        border-top: 1px solid rgba(255, 255, 255, 0.14);
        flex-wrap: wrap;
      }
      .hero__stats dt { font-size: var(--hp-text-xl); font-weight: var(--hp-weight-semi); color: #fff; line-height: 1.2; }
      .hero__stats dd { margin: 0; font-size: var(--hp-text-xs); color: #8fa6c6; }

      /* ----------------------------- المخطط ----------------------------- */
      .schematic { margin: 0; }
      .schematic svg { width: 100%; height: auto; overflow: visible; }
      .schematic figcaption {
        margin-top: var(--hp-space-3);
        font-size: var(--hp-text-xs);
        color: #8fa6c6;
        text-align: center;
      }

      .wall { stroke: #7fa3cc; stroke-width: 2.2; fill: none; stroke-linejoin: round; }
      .dim { stroke: #3e5b80; stroke-width: 1; stroke-dasharray: 3 4; }
      .rooms rect { fill: rgba(255, 255, 255, 0.035); stroke: #4e7099; stroke-width: 1.2; }
      .room-labels text { fill: #93aacb; font-size: 11.5px; font-weight: var(--hp-weight-medium); }

      .pin { opacity: 0; animation: pin-in 0.5s var(--hp-ease) forwards; animation-delay: var(--delay, 0ms); }
      .pin__dot { stroke: #0f1d36; stroke-width: 2; }
      .pin__leader { stroke-width: 1.4; }
      .pin__tag text { font-size: 11px; font-weight: var(--hp-weight-semi); }
      .pin__note { fill: #8fa6c6; font-weight: var(--hp-weight-normal) !important; }
      .pin__pulse { animation: pin-pulse 2.4s var(--hp-ease) infinite; }

      @keyframes pin-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pin-pulse {
        0% { opacity: 0.5; r: 7; }
        70%, 100% { opacity: 0; r: 17; }
      }
      @media (prefers-reduced-motion: reduce) {
        .pin { opacity: 1; animation: none; }
        .pin__pulse { animation: none; opacity: 0.28; }
      }

      /* ---------------------------- المميزات ---------------------------- */
      .features {
        position: relative;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        background: var(--hp-surface);
        border-top: 1px solid var(--hp-border);
      }
      .feature { padding: var(--hp-space-6); border-inline-start: 1px solid var(--hp-border); }
      .feature:first-child { border-inline-start: 0; }
      .feature h2 { font-size: var(--hp-text-md); margin-bottom: var(--hp-space-2); }
      .feature p { font-size: var(--hp-text-sm); color: var(--hp-text-muted); margin: 0; }
      .feature__icon {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        margin-bottom: var(--hp-space-3);
        border: 1px solid var(--hp-border);
        border-radius: 7px;
        background: var(--hp-surface-sunken);
        color: var(--hp-text-muted);
      }
      .feature__icon ::ng-deep svg { stroke: currentColor; }

      /* ---------------------------- الخطوات ---------------------------- */
      .how { padding: var(--hp-space-16) 0; }
      .how__title { font-size: var(--hp-text-xl); margin-bottom: var(--hp-space-8); }
      .steps {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--hp-space-6);
      }
      .steps li { padding-top: var(--hp-space-4); border-top: 2px solid var(--hp-navy-700); }
      .steps__num {
        display: block;
        font-size: var(--hp-text-sm);
        font-weight: var(--hp-weight-semi);
        color: var(--hp-text-muted);
        margin-bottom: var(--hp-space-2);
      }
      .steps h3 { font-size: var(--hp-text-md); margin-bottom: var(--hp-space-2); }
      .steps p { font-size: var(--hp-text-sm); color: var(--hp-text-muted); margin: 0; }

      /* ----------------------------- الخاتمة ----------------------------- */
      .closer { background: var(--hp-surface); border-block: 1px solid var(--hp-border); }
      .closer__inner {
        display: flex;
        align-items: center;
        gap: var(--hp-space-6);
        padding-block: var(--hp-space-10);
        flex-wrap: wrap;
      }
      .closer h2 { font-size: var(--hp-text-xl); margin-bottom: var(--hp-space-2); }
      .closer p { font-size: var(--hp-text-sm); color: var(--hp-text-muted); margin: 0; }
      .closer .hp-btn { margin-inline-start: auto; }

      .foot { padding-block: var(--hp-space-6) var(--hp-space-10); font-size: var(--hp-text-xs); color: var(--hp-text-muted); }
      .foot__inner { display: flex; gap: var(--hp-space-6); flex-wrap: wrap; }
      .foot__links { display: flex; gap: var(--hp-space-4); margin-inline-start: auto; }
      .foot__links a { color: var(--hp-text-muted); }

      /* ---------------------------- الموبايل ---------------------------- */
      @media (max-width: 980px) {
        .hero__inner { grid-template-columns: 1fr; padding-inline: var(--hp-space-5); }
        .hero h1 { font-size: var(--hp-text-2xl); }
        .features { grid-template-columns: repeat(2, 1fr); }
        .feature:nth-child(3) { border-inline-start: 0; }
        .feature:nth-child(n + 3) { border-top: 1px solid var(--hp-border); }
        .steps { grid-template-columns: 1fr; }
      }
      @media (max-width: 620px) {
        .topnav__link { display: none; }
        .features { grid-template-columns: 1fr; }
        .feature { border-inline-start: 0; border-top: 1px solid var(--hp-border); }
        .feature:first-child { border-top: 0; }
        .closer .hp-btn { margin-inline-start: 0; width: 100%; }
      }
    `,
  ],
})
export class LandingComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly pins: Pin[] = [
    {
      x: 452, y: 176, state: 'late',
      title: 'سخّان — صيانة متأخرة', note: 'فات ميعادها ١٢ يوم',
      boxX: 300, boxY: 160, boxW: 132, lineTo: { x: 434, y: 176 },
    },
    {
      x: 150, y: 150, state: 'due',
      title: 'تكييف — تنظيف فلتر', note: 'خلال ٦ أيام',
      boxX: 34, boxY: 102, boxW: 118, lineTo: { x: 150, y: 134 },
    },
    {
      x: 312, y: 200, state: 'ok',
      title: 'غسّالة — الضمان ساري', note: 'باقي ١٤ شهر',
      boxX: 186, boxY: 208, boxW: 126, lineTo: { x: 312, y: 216 },
    },
    {
      x: 118, y: 300, state: 'info',
      title: 'عدّاد الكهربا', note: '٤١٢ ج.م هذا الشهر',
      boxX: 34, boxY: 308, boxW: 132, lineTo: { x: 118, y: 314 },
    },
  ];

  readonly features: { title: string; body: string; icon: SafeHtml }[] = [
    {
      title: 'صيانة في ميعادها',
      body: 'جدول سنوي بيتظبط على أجهزتك، وتنبيه قبل الميعاد بأسبوع.',
      icon: this.svg(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>`),
    },
    {
      title: 'ضمانات وفواتير',
      body: 'صوّر الفاتورة والنظام يقرأ التاريخ والمبلغ ويربطهم بالجهاز.',
      icon: this.svg(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M14 3v5h5M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M9 13h6M9 17h4"/></svg>`),
    },
    {
      title: 'مصاريف البيت',
      body: 'كل جنيه راح فين — كهربا، صيانة، اشتراكات — في رسم واحد.',
      icon: this.svg(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M3 17l5-5 4 3 8-8"/><path d="M15 7h5v5"/></svg>`),
    },
    {
      title: 'فنّي لما تحتاج',
      body: 'ابعت طلب، استلم عروض من فنيين مقيَّمين، واتفق داخل التطبيق.',
      icon: this.svg(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 1 5.4-5.4z"/></svg>`),
    },
  ];

  readonly steps = [
    { title: 'سجّل بيتك', body: 'المساحة، عدد الأوض، ونوع الوحدة — دقيقة واحدة.' },
    { title: 'ضيف أجهزتك', body: 'صوّر الفاتورة أو لوحة الموديل، والنظام يملا الباقي.' },
    { title: 'استلم تنبيهاتك', body: 'جدول الصيانة بيتبني لوحده، ويوصلك قبل كل ميعاد.' },
  ];

  /** الأيقونات مكتوبة عندنا مش جاية من مستخدم، فآمن نعديها كما هي. */
  private svg(markup: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(markup);
  }

  color(state: Pin['state']): string {
    return {
      ok: 'var(--hp-ok)',
      due: 'var(--hp-due)',
      late: 'var(--hp-late)',
      info: '#5b8fd1',
    }[state];
  }

  tagFill(state: Pin['state']): string {
    return {
      ok: '#0e2a22',
      due: '#2a2112',
      late: '#2a1712',
      info: '#111f33',
    }[state];
  }
}
