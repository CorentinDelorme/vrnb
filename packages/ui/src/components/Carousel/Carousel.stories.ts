import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Carousel } from "./Carousel";

const meta = {
  title: "Components/Carousel",
  component: Carousel,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleItems = Array.from({ length: 5 }, (_, i) => ({
  id: `item-${i}`,
  imageUrl: `https://placehold.co/300x200?text=Slide+${i + 1}`,
  alt: `Slide ${i + 1}`,
  label: `Slide ${i + 1}`,
}));

export const Default: Story = {
  args: {
    items: sampleItems,
  },
};

export const WithLinks: Story = {
  args: {
    items: sampleItems.map((item) => ({ ...item, href: "#" })),
  },
};

export const NoAutoScroll: Story = {
  args: {
    items: sampleItems,
    autoScroll: false,
  },
};

export const SingleItem: Story = {
  args: {
    items: [sampleItems[0]!],
  },
};

export const Empty: Story = {
  args: {
    items: [],
  },
};
