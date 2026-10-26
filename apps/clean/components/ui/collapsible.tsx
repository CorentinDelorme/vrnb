'use client';

import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />;
}

function CollapsibleContent({ className, ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={[
        'grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out data-[state=open]:grid-rows-[1fr] overflow-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
