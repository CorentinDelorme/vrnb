import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Navbar } from './Navbar';

const meta = {
  title: 'Components/Navbar',
  component: Navbar,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    logo: <a className="text-xl font-bold" href="/">VRNB</a>,
    menuItems: (
      <>
        <li><a href="/">Accueil</a></li>
        <li><a href="/activites">Programme</a></li>
        <li><a href="/contact">Contact</a></li>
      </>
    ),
    actions: <button className="btn btn-primary btn-sm">Connexion</button>,
  },
};

export const WithDropdown: Story = {
  args: {
    logo: <a className="text-xl font-bold" href="/">VRNB</a>,
    menuItems: (
      <>
        <li><a href="/">Accueil</a></li>
        <li>
          <details>
            <summary>Association</summary>
            <ul>
              <li><a href="/presentation">Présentation</a></li>
              <li><a href="/organisation">Organisation</a></li>
            </ul>
          </details>
        </li>
      </>
    ),
  },
};

export const MinimalLogo: Story = {
  args: {
    logo: <span className="text-xl font-bold">VRNB</span>,
  },
};
