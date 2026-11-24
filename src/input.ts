export class InputManager {
  private held = new Set<string>();
  private justPressed = new Set<string>();
  private justReleased = new Set<string>();

  public jumpBuffer = 0;
  public attackBuffer = 0;
  public dashBuffer = 0;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const code = e.code;
    if (
      code === 'Space' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight'
    ) {
      e.preventDefault();
    }
    if (!this.held.has(code)) {
      this.justPressed.add(code);
      if (this.isJumpKey(code)) this.jumpBuffer = 0.13;
      if (this.isAttackKey(code)) this.attackBuffer = 0.12;
      if (this.isDashKey(code)) this.dashBuffer = 0.12;
    }
    this.held.add(code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const code = e.code;
    this.held.delete(code);
    this.justReleased.add(code);
  };

  private onBlur = () => {
    this.held.clear();
    this.justPressed.clear();
    this.justReleased.clear();
  };

  private isJumpKey(code: string): boolean {
    return code === 'Space' || code === 'KeyZ';
  }

  private isAttackKey(code: string): boolean {
    return code === 'KeyJ' || code === 'KeyX';
  }

  private isDashKey(code: string): boolean {
    return code === 'KeyK' || code === 'ShiftLeft' || code === 'ShiftRight';
  }

  public updateBuffers(dt: number) {
    if (this.jumpBuffer > 0) this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    if (this.attackBuffer > 0) this.attackBuffer = Math.max(0, this.attackBuffer - dt);
    if (this.dashBuffer > 0) this.dashBuffer = Math.max(0, this.dashBuffer - dt);
  }

  public clearFrameEvents() {
    this.justPressed.clear();
    this.justReleased.clear();
  }

  public get left(): boolean {
    return this.held.has('KeyA') || this.held.has('ArrowLeft');
  }

  public get right(): boolean {
    return this.held.has('KeyD') || this.held.has('ArrowRight');
  }

  public get up(): boolean {
    return this.held.has('KeyW') || this.held.has('ArrowUp');
  }

  public get down(): boolean {
    return this.held.has('KeyS') || this.held.has('ArrowDown');
  }

  public get jumpHeld(): boolean {
    return this.held.has('Space') || this.held.has('KeyZ');
  }

  public get jumpReleased(): boolean {
    return this.justReleased.has('Space') || this.justReleased.has('KeyZ');
  }

  public get focusHeld(): boolean {
    return this.held.has('KeyL') || this.held.has('KeyC');
  }

  public get interactPressed(): boolean {
    return this.justPressed.has('KeyE') || this.justPressed.has('ArrowUp') || this.justPressed.has('KeyW');
  }

  public get mutePressed(): boolean {
    return this.justPressed.has('KeyM');
  }

  public get restartPressed(): boolean {
    return this.justPressed.has('KeyR');
  }

  public get anyPressed(): boolean {
    return this.justPressed.size > 0;
  }

  public consumeJump(): boolean {
    if (this.jumpBuffer > 0) {
      this.jumpBuffer = 0;
      return true;
    }
    return false;
  }

  public consumeAttack(): boolean {
    if (this.attackBuffer > 0) {
      this.attackBuffer = 0;
      return true;
    }
    return false;
  }

  public consumeDash(): boolean {
    if (this.dashBuffer > 0) {
      this.dashBuffer = 0;
      return true;
    }
    return false;
  }
}
