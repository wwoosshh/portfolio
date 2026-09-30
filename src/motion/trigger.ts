import { ScrollTrigger } from './gsap';

export interface PlayOnEnterVars {
  trigger: Element;
  start: ScrollTrigger.Vars['start'];
  containerAnimation?: gsap.core.Animation;
}

/**
 * 화면에 들어오면 한 번 재생한다. 애니메이션은 이 함수가 멈춰 둔다(pause). once 트리거를 애니메이션에 묶지 않고 onEnter에서 play()를 부른다.
 * 애니메이션에 묶인 once 트리거가 여럿 이미 지나간 상태에서 새로 고침이 일어나면 ScrollTrigger가 오류로 멈추기 때문이다(P1-R28).
 * 이미 시작과 끝을 모두 지나친 트리거(맨 아래에서 새로 고침 등)도 onEnter가 불려야 재생된다. 이는 ScrollTrigger의 전역 설정 limitCallbacks가 기본값(false)인 데 기댄다.
 * true로 바꾸면 활성 상태가 바뀌지 않은 트리거의 콜백은 불리지 않아, 그 애니메이션이 멈춘 채 숨어 남는다.
 */
export function playOnEnter(animation: gsap.core.Animation, vars: PlayOnEnterVars): ScrollTrigger {
  animation.pause();
  return ScrollTrigger.create({ ...vars, once: true, onEnter: () => animation.play() });
}
