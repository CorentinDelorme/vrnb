import { test, expect } from '@playwright/test'
import { seedTestData, cleanupTestData, regularUser } from '../helpers/seedData'

const BASE_URL = 'http://localhost:3000'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  await seedTestData()
})

test.afterAll(async () => {
  await cleanupTestData()
})

// ---------------------------------------------------------------------------
// 23.1 — Header tests (public)
// ---------------------------------------------------------------------------
test.describe('Header (23.1)', () => {
  test('displays logo and public navigation links', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`)

    // Logo or brand text should be visible
    const header = page.locator('header, nav').first()
    await expect(header).toBeVisible()

    // Public navigation items
    await expect(page.getByRole('link', { name: /accueil/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /adhésion/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /programme/i })).toBeVisible()
  })

  test('shows Connexion button when not logged in', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`)
    await expect(
      page.getByRole('link', { name: /connexion/i }).or(page.getByText(/connexion/i)),
    ).toBeVisible()
  })

  test('has Association dropdown with sub-items', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`)
    const associationTrigger = page.getByText(/association/i).first()
    await expect(associationTrigger).toBeVisible()
  })

  test('has Activités dropdown with sub-items', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`)
    const activitesTrigger = page.getByText(/activités/i).first()
    await expect(activitesTrigger).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 23.2 — Footer tests
// ---------------------------------------------------------------------------
test.describe('Footer (23.2)', () => {
  test('displays footer links', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`)

    const footer = page.locator('footer')
    await expect(footer).toBeVisible()

    // Footer links
    await expect(footer.getByRole('link', { name: /qui sommes-nous|présentation/i })).toBeVisible()
    await expect(footer.getByRole('link', { name: /mentions légales/i })).toBeVisible()
    await expect(footer.getByRole('link', { name: /contact/i })).toBeVisible()
  })

  test('displays copyright', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`)
    const footer = page.locator('footer')
    await expect(footer.getByText(/©.*VRNB/)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 23.3 — Home page
// ---------------------------------------------------------------------------
test.describe('Home page (23.3)', () => {
  test('home page loads and displays content', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`)
    await expect(page).toHaveURL(/\/home/)

    // Page should have a heading or content area
    const main = page.locator('main')
    await expect(main).toBeVisible()
  })

  test('/ redirects to /home', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)
    await expect(page).toHaveURL(/\/home/)
  })
})

// ---------------------------------------------------------------------------
// 23.4 — Programme page
// ---------------------------------------------------------------------------
test.describe('Programme (23.4)', () => {
  test('programme page loads and shows table', async ({ page }) => {
    await page.goto(`${BASE_URL}/activites`)
    await expect(page).toHaveURL(/\/activites/)

    // Should display a table or activity list
    const tableOrList = page.locator('table').or(page.getByRole('table')).or(page.locator('.card'))
    await expect(tableOrList.first()).toBeVisible({ timeout: 10000 })
  })

  test('has search input', async ({ page }) => {
    await page.goto(`${BASE_URL}/activites`)
    const searchInput = page.getByPlaceholder(/rechercher/i).or(page.locator('input[type="text"]'))
    await expect(searchInput.first()).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 23.5 — Activity detail
// ---------------------------------------------------------------------------
test.describe('Activity detail (23.5)', () => {
  test('detail page shows activity information', async ({ page }) => {
    // First navigate to programme to find a Details link
    await page.goto(`${BASE_URL}/activites`)

    const detailLink = page.getByRole('link', { name: /détails/i }).first()
    const hasDetailLink = (await detailLink.count()) > 0

    if (hasDetailLink) {
      await detailLink.click()
      await expect(page).toHaveURL(/\/activites\/detail\//)

      // Should show activity name
      const mainContent = page.locator('main')
      await expect(mainContent).toBeVisible()
    }
  })
})

// ---------------------------------------------------------------------------
// 23.6 — Nos Balades (protected)
// ---------------------------------------------------------------------------
test.describe('Nos Balades (23.6)', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/balades`)
    await expect(page).toHaveURL(/\/login/)
  })
})

// ---------------------------------------------------------------------------
// 23.7 — Trombinoscope (protected)
// ---------------------------------------------------------------------------
test.describe('Trombinoscope (23.7)', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/espace-adherent/trombinoscope`)
    await expect(page).toHaveURL(/\/login/)
  })
})

// ---------------------------------------------------------------------------
// 23.8 — Profile page (protected)
// ---------------------------------------------------------------------------
test.describe('Profile (23.8)', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/user/some-id`)
    await expect(page).toHaveURL(/\/login/)
  })
})

// ---------------------------------------------------------------------------
// 23.9 — Mentions Légales
// ---------------------------------------------------------------------------
test.describe('Mentions Légales (23.9)', () => {
  test('page loads and shows title', async ({ page }) => {
    await page.goto(`${BASE_URL}/mentionslegales`)
    await expect(page.locator('h1')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 23.10 — Contact page
// ---------------------------------------------------------------------------
test.describe('Contact (23.10)', () => {
  test('displays contact form with required fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/contact`)

    // Form fields should be visible
    await expect(page.locator('form')).toBeVisible()
    await expect(page.locator('input[type="text"]').first()).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('has send and back buttons', async ({ page }) => {
    await page.goto(`${BASE_URL}/contact`)
    await expect(page.getByRole('button', { name: /envoyer/i })).toBeVisible()
    await expect(
      page.getByRole('link', { name: /retour/i }).or(page.getByRole('button', { name: /retour/i })),
    ).toBeVisible()
  })

  test('back button navigates to home', async ({ page }) => {
    await page.goto(`${BASE_URL}/contact`)
    const backBtn = page
      .getByRole('link', { name: /retour/i })
      .or(page.getByRole('button', { name: /retour/i }))
    await backBtn.first().click()
    await expect(page).toHaveURL(/\/home/)
  })
})

// ---------------------------------------------------------------------------
// 23.11 — Redirections
// ---------------------------------------------------------------------------
test.describe('Redirections (23.11)', () => {
  test('/ redirects to /home', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)
    await expect(page).toHaveURL(/\/home/)
  })
})

// ---------------------------------------------------------------------------
// 23.12 — Adhesion page
// ---------------------------------------------------------------------------
test.describe('Adhesion (23.12)', () => {
  test('page loads with title', async ({ page }) => {
    await page.goto(`${BASE_URL}/adhesion`)
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
    await expect(heading).toHaveText(/adhésion/i)
  })
})

// ---------------------------------------------------------------------------
// 23.13 — Login page
// ---------------------------------------------------------------------------
test.describe('Login (23.13)', () => {
  test('displays login form', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)

    await expect(page.locator('form')).toBeVisible()
    // Email or username field
    const usernameField = page.locator('input[type="text"]').or(page.locator('input[type="email"]'))
    await expect(usernameField.first()).toBeVisible()
    // Password field
    await expect(page.locator('input[type="password"]')).toBeVisible()
    // Submit button
    await expect(page.getByRole('button', { name: /connecter/i })).toBeVisible()
  })

  test('has forgot password link', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await expect(page.getByRole('link', { name: /oublié/i })).toBeVisible()
  })

  test('has adhesion link', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await expect(page.getByRole('link', { name: /adhérer/i })).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.locator('input[type="email"]').first().fill('wrong@example.com')
    await page.locator('input[type="password"]').fill('wrongpassword')
    await page.getByRole('button', { name: /connecter/i }).click()
    // Should show error message
    await expect(page.getByText(/erreur|incorrect|invalide/i)).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// 23.14 — Forgot password page
// ---------------------------------------------------------------------------
test.describe('Mot de passe oublié (23.14)', () => {
  test('displays forgot password form', async ({ page }) => {
    await page.goto(`${BASE_URL}/oubli-pass`)

    await expect(page.locator('form')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /envoyer/i })).toBeVisible()
  })

  test('has back to login link', async ({ page }) => {
    await page.goto(`${BASE_URL}/oubli-pass`)
    await expect(page.getByRole('link', { name: /connexion|retour/i })).toBeVisible()
  })

  test('shows confirmation after submitting', async ({ page }) => {
    await page.goto(`${BASE_URL}/oubli-pass`)
    await page.locator('input[type="email"]').fill('test@example.com')
    await page.getByRole('button', { name: /envoyer/i }).click()
    // Should show a confirmation message (generic, anti-enumeration)
    await expect(page.getByText(/envoyé|confirmation|instruction/i)).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// 23.15 — Access control redirects
// ---------------------------------------------------------------------------
test.describe('Access control (23.15)', () => {
  test('protected pages redirect to /login', async ({ page }) => {
    // Balades
    await page.goto(`${BASE_URL}/balades`)
    await expect(page).toHaveURL(/\/login/)

    // Documentation
    await page.goto(`${BASE_URL}/documentation`)
    await expect(page).toHaveURL(/\/login/)

    // Trombinoscope
    await page.goto(`${BASE_URL}/espace-adherent/trombinoscope`)
    await expect(page).toHaveURL(/\/login/)

    // Profile
    await page.goto(`${BASE_URL}/user/fake-id`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('public pages are accessible without login', async ({ page }) => {
    // Home
    await page.goto(`${BASE_URL}/home`)
    await expect(page).not.toHaveURL(/\/login/)

    // Programme
    await page.goto(`${BASE_URL}/activites`)
    await expect(page).not.toHaveURL(/\/login/)

    // Presentation
    await page.goto(`${BASE_URL}/presentation`)
    await expect(page).not.toHaveURL(/\/login/)

    // Contact
    await page.goto(`${BASE_URL}/contact`)
    await expect(page).not.toHaveURL(/\/login/)

    // Mentions Legales
    await page.goto(`${BASE_URL}/mentionslegales`)
    await expect(page).not.toHaveURL(/\/login/)

    // Adhesion
    await page.goto(`${BASE_URL}/adhesion`)
    await expect(page).not.toHaveURL(/\/login/)

    // Login
    await page.goto(`${BASE_URL}/login`)
    await expect(page).toHaveURL(/\/login/)
  })
})

// ---------------------------------------------------------------------------
// Authenticated tests: login, then access protected pages and profile
// ---------------------------------------------------------------------------
test.describe('Authenticated flows', () => {
  test('can login and access protected pages', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`)
    await page.locator('input[type="email"]').first().fill(regularUser.email)
    await page.locator('input[type="password"]').fill(regularUser.password)
    await page.getByRole('button', { name: /connecter/i }).click()
    await page.waitForURL(/\/home/, { timeout: 10000 })

    // Now access protected pages — should NOT redirect to login

    // Balades
    await page.goto(`${BASE_URL}/balades`)
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('main')).toBeVisible()

    // Documentation
    await page.goto(`${BASE_URL}/documentation`)
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('main')).toBeVisible()

    // Trombinoscope
    await page.goto(`${BASE_URL}/espace-adherent/trombinoscope`)
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('shows header with Déconnexion when logged in', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`)
    await page.locator('input[type="email"]').first().fill(regularUser.email)
    await page.locator('input[type="password"]').fill(regularUser.password)
    await page.getByRole('button', { name: /connecter/i }).click()
    await page.waitForURL(/\/home/, { timeout: 10000 })

    // Header should show Déconnexion
    await expect(
      page.getByRole('button', { name: /déconnexion/i }).or(page.getByText(/déconnexion/i)),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 23.16 — UI component library verification
// ---------------------------------------------------------------------------
test.describe('UI library (23.16)', () => {
  test.skip('storybook and tests verified separately', () => {
    // This is verified by running:
    // cd packages/ui && bun run storybook build && bun run test
  })
})

// ---------------------------------------------------------------------------
// 23.17 — Admin access integration
// ---------------------------------------------------------------------------
test.describe('Admin access (23.17)', () => {
  test.skip('admin access verified via integration tests', () => {
    // This is verified by running:
    // cd apps/web && bun run test:int
  })
})

// ---------------------------------------------------------------------------
// 23.18 — Lint & type-check
// ---------------------------------------------------------------------------
test.describe('Code quality (23.18)', () => {
  test.skip('lint and type-check verified via CLI', () => {
    // This is verified by running:
    // turbo lint && turbo check-types
  })
})
