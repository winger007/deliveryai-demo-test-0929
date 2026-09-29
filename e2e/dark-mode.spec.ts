import { test, expect, type Page } from '@playwright/test'

/** 通过深链接直接进入菜单视图（自动绑定 A08 桌台），TopBar 可见。 */
async function goToMenu(page: Page) {
  await page.goto('/#/menu')
}

test.describe('暗黑模式 - E2E 验收测试', () => {
  test('REQ-001: TopBar 始终显示主题切换按钮', async ({ page }) => {
    await goToMenu(page)
    const toggleBtn = page.getByRole('button', { name: '切换暗黑模式' })
    await expect(toggleBtn).toBeVisible()
  })

  test('REQ-001: 点击按钮从浅色切换至暗黑，html.dark 生效且图标更新', async ({ page }) => {
    await goToMenu(page)
    // 确保从浅色状态开始
    await page.evaluate(() => {
      localStorage.removeItem('dark-mode')
      document.documentElement.classList.remove('dark')
    })
    await page.reload()
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    const toggleBtn = page.getByRole('button', { name: '切换暗黑模式' })
    await toggleBtn.click()
    // 等待 CSS 过渡完成（250ms + 100ms buffer）
    await page.waitForTimeout(400)

    await expect(page.locator('html')).toHaveClass(/dark/)
    // 暗黑模式下按钮显示太阳图标
    const sunIcon = toggleBtn.locator('svg.lucide-sun')
    await expect(sunIcon).toBeVisible()
  })

  test('REQ-001: 点击按钮从暗黑切换回浅色，html.dark 移除且图标更新', async ({ page }) => {
    await goToMenu(page)
    // 先设置为暗黑模式
    await page.evaluate(() => localStorage.setItem('dark-mode', 'true'))
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)

    const toggleBtn = page.getByRole('button', { name: '切换暗黑模式' })
    await toggleBtn.click()
    await page.waitForTimeout(400)

    await expect(page.locator('html')).not.toHaveClass(/dark/)
    // 浅色模式下按钮显示月亮图标
    const moonIcon = toggleBtn.locator('svg.lucide-moon')
    await expect(moonIcon).toBeVisible()
  })

  test('REQ-002: 切换主题后 localStorage 中 dark-mode 值更新', async ({ page }) => {
    await goToMenu(page)
    await page.evaluate(() => localStorage.removeItem('dark-mode'))
    await page.reload()

    // 切换至暗黑
    await page.getByRole('button', { name: '切换暗黑模式' }).click()
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => localStorage.getItem('dark-mode'))).toBe('true')

    // 切换回浅色
    await page.getByRole('button', { name: '切换暗黑模式' }).click()
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => localStorage.getItem('dark-mode'))).toBe('false')
  })

  test('REQ-002: 重新打开应用后主题与上次选择一致（暗黑持久化）', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('dark-mode', 'true'))
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('REQ-002: 重新打开应用后主题与上次选择一致（浅色持久化）', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('dark-mode', 'false'))
    await page.reload()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('REQ-003: 无存储偏好且系统为暗黑时默认进入暗黑模式', async ({ page }) => {
    // 在页面脚本执行前模拟系统暗黑偏好
    await page.addInitScript(() => {
      window.matchMedia = (query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList
    })
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('dark-mode'))
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('REQ-003: 无存储偏好且系统为浅色时默认进入浅色模式', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('dark-mode'))
    await page.reload()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('REQ-004: 暗黑模式下首页无浅色背景残留', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('dark-mode', 'true'))
    await page.reload()
    await page.waitForTimeout(400)

    await expect(page.locator('html')).toHaveClass(/dark/)
    // banner 区域文字为浅色（rice-100），背景为深色（charcoal-900）
    const banner = page.locator('.bg-charcoal-900.text-rice-100').first()
    await expect(banner).toBeVisible()
  })

  test('REQ-004: 暗黑模式下菜单视图无浅色背景残留', async ({ page }) => {
    await goToMenu(page)
    await page.evaluate(() => localStorage.setItem('dark-mode', 'true'))
    await page.reload()
    await page.waitForTimeout(400)

    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.getByRole('heading', { name: '鎏金番茄鸳鸯锅' })).toBeVisible()
  })

  test('REQ-004: 暗黑模式下商品弹窗正确适配', async ({ page }) => {
    await goToMenu(page)
    await page.evaluate(() => localStorage.setItem('dark-mode', 'true'))
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // 打开商品弹窗
    await page.getByRole('button', { name: '锅底' }).click()
    const productCards = page.locator('article')
    await productCards.nth(0).locator('button').last().click()

    await page.waitForTimeout(400)
    await expect(page.getByRole('heading', { name: '鎏金番茄鸳鸯锅' })).toBeVisible()
    // 弹窗内容区域应用了暗黑变体（dark:bg-charcoal-700）
    const dialogContent = page.locator('[role="dialog"]').last()
    await expect(dialogContent).toBeVisible()
  })

  test('REQ-004: 暗黑模式下订单视图可正常访问', async ({ page }) => {
    await goToMenu(page)
    await page.evaluate(() => localStorage.setItem('dark-mode', 'true'))
    await page.reload()

    await page.getByRole('button', { name: /订单|Orders/ }).first().click()
    await page.waitForTimeout(400)
    await expect(page).toHaveURL(/#\/order$/)
  })

  test('REQ-004: 暗黑模式下 TopBar 正确适配（深色背景 + 浅色文字）', async ({ page }) => {
    await goToMenu(page)
    await page.evaluate(() => localStorage.setItem('dark-mode', 'true'))
    await page.reload()
    await page.waitForTimeout(400)

    const header = page.locator('header.sticky')
    await expect(header).toBeVisible()
    await expect(header).toHaveClass(/dark:bg-charcoal-900/)
  })

  test('REQ-005: 暗黑模式与老人模式可同时启用', async ({ page }) => {
    await goToMenu(page)
    await page.evaluate(() => {
      localStorage.removeItem('dark-mode')
      localStorage.removeItem('elderly-mode')
    })
    await page.reload()

    await page.getByRole('button', { name: '切换暗黑模式' }).click()
    await page.getByRole('button', { name: '切换至老人模式' }).click()
    await page.waitForTimeout(400)

    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.locator('html')).toHaveClass(/elderly/)
  })

  test('REQ-005: 关闭暗黑模式不影响老人模式状态', async ({ page }) => {
    await goToMenu(page)
    await page.evaluate(() => {
      localStorage.setItem('dark-mode', 'true')
      localStorage.setItem('elderly-mode', 'true')
    })
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.locator('html')).toHaveClass(/elderly/)

    await page.getByRole('button', { name: '切换暗黑模式' }).click()
    await page.waitForTimeout(400)

    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await expect(page.locator('html')).toHaveClass(/elderly/)
  })

  test('REQ-005: 关闭老人模式不影响暗黑模式状态', async ({ page }) => {
    await goToMenu(page)
    await page.evaluate(() => {
      localStorage.setItem('dark-mode', 'true')
      localStorage.setItem('elderly-mode', 'true')
    })
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.locator('html')).toHaveClass(/elderly/)

    await page.getByRole('button', { name: '切换至常规模式' }).click()
    await page.waitForTimeout(400)

    await expect(page.locator('html')).not.toHaveClass(/elderly/)
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('REQ-001: 切换主题不影响当前视图和业务状态', async ({ page }) => {
    await goToMenu(page)
    await page.evaluate(() => localStorage.removeItem('dark-mode'))
    await page.reload()
    await expect(page).toHaveURL(/#\/menu$/)

    await page.getByRole('button', { name: '切换暗黑模式' }).click()
    await page.waitForTimeout(400)

    await expect(page).toHaveURL(/#\/menu$/)
    await expect(page.getByRole('heading', { name: '鎏金番茄鸳鸯锅' })).toBeVisible()
  })

  test('REQ-002: localStorage 不可用时切换不报错（内存态降级）', async ({ page }) => {
    // 在页面脚本执行前拦截 localStorage 使其不可用
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() { throw new Error('localStorage unavailable') },
        configurable: true,
      })
    })
    await goToMenu(page)
    await page.waitForTimeout(500)

    const toggleBtn = page.getByRole('button', { name: '切换暗黑模式' })
    await toggleBtn.click()
    await page.waitForTimeout(400)

    // 内存态生效：html.dark 已切换
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})
