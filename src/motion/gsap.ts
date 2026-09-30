// GSAP과 플러그인은 이곳에서만 등록한다(설계 §5.2).
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CURVE, DURATION, EASE, curvePath } from './tokens';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, CustomEase);
CustomEase.create(EASE.out, curvePath(CURVE.out));
CustomEase.create(EASE.inOut, curvePath(CURVE.inOut));
CustomEase.create(EASE.back, curvePath(CURVE.back));
gsap.defaults({ duration: DURATION.base, ease: EASE.out });

export { gsap, ScrollTrigger, SplitText };
