import {
  InjectionKey,
  PropType,
  Teleport,
  Transition,
  computed,
  defineComponent,
  inject,
  onBeforeUnmount,
  provide,
  reactive,
  ref,
  watch,
} from 'vue';
import { WowerlayBaseProps, wowerlayBaseProps } from './WowerlayReusables';
import { cWowerlayAnimEnter, cWowerlayAnimLeave, cWowerlayBackground } from '../consts';

import { WowerlayRenderer } from './WowerlayRenderer';
import { isElement } from '../utils';
import { useWowerlayContext } from '../plugin';

export interface WowerlayProps extends WowerlayBaseProps {
  visible: boolean;
}

const Props = {
  visible: {
    required: true,
    type: Boolean as PropType<WowerlayProps['visible']>,
  } as const,
};
const Emits = {
  'update:visible': (() => true) as unknown as (value: boolean) => void,
} as const;

interface ParentWowerlayContext {
  onClose: (hook: () => void) => void;
}

const ParentWowerlayContextInjectionKey: InjectionKey<ParentWowerlayContext> = Symbol('key');

export const Wowerlay = defineComponent({
  name: 'Wowerlay',
  inheritAttrs: false,
  props: {
    ...wowerlayBaseProps,
    ...Props,
  },
  emits: Emits,
  setup(props, { emit }) {
    const { onWindowClick } = useWowerlayContext();
    const parentWowerlay = inject(ParentWowerlayContextInjectionKey, null);

    const childrenWowerlayHooks = reactive([]) as (() => void)[];
    const canClose = ref(false);
    const isVisible = computed(() => isElement(props.target) && props.visible);

    const closeChildWowerlays = () => {
      childrenWowerlayHooks.forEach((v) => v());
    };

    const close = () => {
      if (!props.visible) return;

      if (canClose.value) {
        closeChildWowerlays();
        childrenWowerlayHooks.length = 0;
        emit('update:visible', false);
      }
    };

    parentWowerlay?.onClose(close);

    const handleWowerlayClick = (e: MouseEvent) => {
      e.stopPropagation();
      closeChildWowerlays();
    };

    const handleContainerClick = (e: MouseEvent) => {
      e.stopPropagation();
      close();
    };

    onWindowClick(close);
    onBeforeUnmount(close);

    watch(
      () => props.visible,
      (state) => {
        if (state) {
          setTimeout(() => {
            canClose.value = true;
          }, 0);
        } else {
          canClose.value = false;
        }
      },
    );

    provide(ParentWowerlayContextInjectionKey, {
      onClose(hook) {
        childrenWowerlayHooks.push(hook);
      },
    });

    return {
      canClose,
      isVisible,
      handleWowerlayClick,
      handleContainerClick,
    };
  },
  render() {
    let willBeRendered: false | JSX.Element = false;

    const Renderer = this.isVisible && (
      <WowerlayRenderer {...this.$props} {...this.$attrs} onClick={this.handleWowerlayClick}>
        {this.$slots.default?.()}
      </WowerlayRenderer>
    );

    if (this.$props.transition === false) {
      willBeRendered = Renderer;
    } else if (typeof this.$props.transition === 'string') {
      willBeRendered = <Transition name={this.$props.transition}>{Renderer}</Transition>;
    } else {
      willBeRendered = (
        <Transition enterActiveClass={cWowerlayAnimEnter} leaveActiveClass={cWowerlayAnimLeave}>
          {Renderer}
        </Transition>
      );
    }

    return (
      <Teleport to="body">
        <div
          class={[
            cWowerlayBackground,
            { 'no-background': this.noBackground || !this.isVisible }, //
          ]}
          onClick={this.handleContainerClick}
          role="tooltip"
        >
          {willBeRendered}
        </div>
      </Teleport>
    );
  },
});
