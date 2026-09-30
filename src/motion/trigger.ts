import { ScrollTrigger } from './gsap';

export interface PlayOnEnterVars {
  trigger: Element;
  start: ScrollTrigger.Vars['start'];
  containerAnimation?: gsap.core.Animation;
}

/**
 * 화면에 들어오면 한 번 재생한다. once 트리거를 애니메이션에 묶지 않고 onEnter에서 play()를 부른다.
 * 애니메이션에 묶인 once 트리거가 여럿 이미 지나간 상태에서 새로 고침이 일어나면 ScrollTrigger가 오류로 멈추기 때문이다(P1-R28).
 */
export function playOnEnter(animation: gsap.core.Animation, vars: PlayOnEnterVars): ScrollTrigger {
  animation.pause();
  return ScrollTrigger.create({ ...vars, once: true, onEnter: () => animation.play() });
}
