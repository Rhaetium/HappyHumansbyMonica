'use client';

import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';

type Props = {
  html: string;
  className?: string;
  style?: CSSProperties;
};

export default function EnhancedRichContent({ html, className, style }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const cleanups: Array<() => void> = [];
    const carousels = Array.from(
      root.querySelectorAll<HTMLElement>('[data-happyhumans-carousel="true"]')
    );

    carousels.forEach((carousel) => {
      const slides = Array.from(
        carousel.querySelectorAll<HTMLElement>('[data-carousel-slide="true"]')
      );

      if (slides.length <= 1) {
        return;
      }

      const previousButton = carousel.querySelector<HTMLButtonElement>(
        '[data-carousel-prev="true"]'
      );
      const nextButton = carousel.querySelector<HTMLButtonElement>(
        '[data-carousel-next="true"]'
      );
      const dots = Array.from(
        carousel.querySelectorAll<HTMLButtonElement>('[data-carousel-dot]')
      );

      let activeIndex = slides.findIndex((slide) =>
        slide.classList.contains('is-active')
      );
      if (activeIndex < 0) {
        activeIndex = 0;
      }

      const render = () => {
        carousel.dataset.enhanced = 'true';
        carousel.tabIndex = 0;

        slides.forEach((slide, index) => {
          const isActive = index === activeIndex;
          slide.classList.toggle('is-active', isActive);
          slide.setAttribute('aria-hidden', String(!isActive));
        });

        dots.forEach((dot, index) => {
          const isActive = index === activeIndex;
          dot.classList.toggle('is-active', isActive);
          dot.setAttribute('aria-pressed', String(isActive));
        });
      };

      const moveTo = (nextIndex: number) => {
        activeIndex = (nextIndex + slides.length) % slides.length;
        render();
      };

      const onPrevious = (event: Event) => {
        event.preventDefault();
        moveTo(activeIndex - 1);
      };

      const onNext = (event: Event) => {
        event.preventDefault();
        moveTo(activeIndex + 1);
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          moveTo(activeIndex - 1);
        }

        if (event.key === 'ArrowRight') {
          event.preventDefault();
          moveTo(activeIndex + 1);
        }
      };

      previousButton?.addEventListener('click', onPrevious);
      nextButton?.addEventListener('click', onNext);
      carousel.addEventListener('keydown', onKeyDown);

      dots.forEach((dot) => {
        const onDotClick = (event: Event) => {
          event.preventDefault();
          const index = Number(dot.dataset.carouselDot);
          if (!Number.isNaN(index)) {
            moveTo(index);
          }
        };

        dot.addEventListener('click', onDotClick);
        cleanups.push(() => dot.removeEventListener('click', onDotClick));
      });

      render();

      cleanups.push(() => previousButton?.removeEventListener('click', onPrevious));
      cleanups.push(() => nextButton?.removeEventListener('click', onNext));
      cleanups.push(() => carousel.removeEventListener('keydown', onKeyDown));
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [html]);

  return (
    <>
      <div ref={rootRef} className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />
      <style>{`
        .happyhumans-carousel {
          margin: 2rem 0;
          border-radius: 1.4rem;
          overflow: hidden;
          border: 1px solid #ece3d8;
          background: #f6f1ea;
          box-shadow: 0 18px 45px rgba(55, 40, 25, 0.08);
        }

        .happyhumans-carousel__viewport {
          position: relative;
          background: linear-gradient(135deg, #f4ede3 0%, #efe5d6 100%);
        }

        .happyhumans-carousel__slide {
          margin: 0;
        }

        .happyhumans-carousel__slide img {
          display: block;
          width: 100%;
          aspect-ratio: 16 / 10;
          object-fit: cover;
          margin: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          background: #eadfce;
        }

        .happyhumans-carousel:not([data-enhanced="true"]) .happyhumans-carousel__controls {
          display: none;
        }

        .happyhumans-carousel[data-enhanced="true"] .happyhumans-carousel__slide {
          display: none;
        }

        .happyhumans-carousel[data-enhanced="true"] .happyhumans-carousel__slide.is-active {
          display: block;
        }

        .happyhumans-carousel__controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.95rem 1rem;
          background: white;
          border-top: 1px solid #ece3d8;
        }

        .happyhumans-carousel__button {
          width: 2.4rem;
          height: 2.4rem;
          border-radius: 999px;
          border: 1px solid #dbcdbd;
          background: #fffaf4;
          color: var(--hh-primary);
          font-size: 1.35rem;
          line-height: 1;
          cursor: pointer;
          transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
        }

        .happyhumans-carousel__button:hover {
          background: #f7ecdf;
          border-color: #caa785;
          transform: translateY(-1px);
        }

        .happyhumans-carousel__dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          flex: 1;
        }

        .happyhumans-carousel__dot {
          width: 0.72rem;
          height: 0.72rem;
          border-radius: 999px;
          border: none;
          background: #d8c7b4;
          cursor: pointer;
          transition: transform 0.18s ease, background 0.18s ease;
        }

        .happyhumans-carousel__dot.is-active {
          background: var(--hh-primary);
          transform: scale(1.15);
        }

        @media (max-width: 640px) {
          .happyhumans-carousel {
            border-radius: 1rem;
          }

          .happyhumans-carousel__controls {
            padding: 0.75rem 0.85rem;
            gap: 0.75rem;
          }

          .happyhumans-carousel__button {
            width: 2.1rem;
            height: 2.1rem;
            font-size: 1.15rem;
          }
        }
      `}</style>
    </>
  );
}
