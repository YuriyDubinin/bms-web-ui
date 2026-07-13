import { motion, type HTMLMotionProps } from 'framer-motion';
import { Children, type ReactNode } from 'react';
import { staggerContainerVariants, staggerItemVariants } from './variants';

export type StaggerListProps = {
  children: ReactNode;
  /** Тэг контейнера. По умолчанию div. */
  as?: 'div' | 'ul' | 'ol';
  /** Задержка между детьми, секунды (30–50ms по гайду). */
  stagger?: number;
  /** Начальная задержка для всего контейнера. */
  delayChildren?: number;
  className?: string;
  itemClassName?: string;
} & Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'variants' | 'children'>;

/**
 * Контейнер для последовательного появления детей. Каждый ребёнок оборачивается
 * в motion-блок с staggerItemVariants. Для собственных variants — используйте FadeIn
 * вручную, минуя StaggerList.
 */
export function StaggerList({
  children,
  as = 'div',
  stagger = 0.04,
  delayChildren = 0.02,
  className,
  itemClassName,
  ...rest
}: StaggerListProps) {
  const variants = {
    ...staggerContainerVariants,
    visible: { transition: { staggerChildren: stagger, delayChildren } },
  };

  const MotionTag = (as === 'ul'
    ? motion.ul
    : as === 'ol'
      ? motion.ol
      : motion.div) as typeof motion.div;

  return (
    <MotionTag
      className={className}
      initial="hidden"
      animate="visible"
      variants={variants}
      {...rest}
    >
      {Children.map(children, (child, idx) => (
        <motion.div
          key={(child as { key?: string | number | null } | null)?.key ?? idx}
          variants={staggerItemVariants}
          className={itemClassName}
        >
          {child}
        </motion.div>
      ))}
    </MotionTag>
  );
}
