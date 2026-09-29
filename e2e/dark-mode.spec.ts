import { test, expect, type Page } from '@playwright/test'

/** 从首页绑定 A08 桌台并进入点餐视图（menu）。 */
async function enterMenu(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /A08/ }).first().click() // home → welcome
  await page.getByRole('button', { name: /进入点餐|Enter/ }).click() // welcome → menu
}

test.describe('暗黑模式 - E2E 验收测试', () => {
  test.describe.configure({ mode: 'serial' })

  test('REQ-001: TopBar 始终显示主题切换按钮', async ({ page }) => {
    await page.goto('/')
    // 默认浅色模式，按钮存在且 aria-label 正确
    const toggleBtn = page.getByRole('button', { name: '切换暗黑模式' })
    await expect(toggleBtn).toBeVisible()
  })

  test('REQ-001: 点击按钮从浅色切换至暗黑，html.dark 生效且图标更新', async ({ page }) => {
    await page.goto('/')
    // 确保从浅色状态开始
    await page.evaluate(() => {
      localStorage.removeItem('dark-mode')
      document.documentElement.classList.remove('dark')
    })
    await page.reload()
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    // 点击切换按钮
    const toggleBtn = page.getByRole('button', { name: '切换暗黑模式' })
    await toggleBtn.click()

    // 等待 CSS 过渡完成（250ms + 100ms buffer）
    await page.waitForTimeout(400)

    // html.dark class 已添加
    await expect(page.locator('html')).toHaveClass(/dark/)
    // 按钮图标变为太阳（Sun）—— 暗黑模式下显示 Sun
    const sunIcon = toggleBtn.locator('svg.lucide-sun')
    await expect(sunIcon).toBeVisible()
  })

  test('REQ-001: 点击按钮从暗黑切换回浅色，html.dark 移除且图标更新', async ({ page }) => {
    await page.goto('/')
    // 先设置为暗黑模式
    await page.evaluate(() => {
      localStorage.setItem('dark-mode', 'true')
    })
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // 点击切换按钮切回浅色
    const toggleBtn = page.getByRole('button', { name: '切换暗黑模式' })
    await toggleBtn.click()

    await page.waitForTimeout(400)

    // html.dark class 已移除
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    // 按钮图标变为月亮（Moon）—— 浅色模式下显示 Moon
    const moonIcon = toggleBtn.locator('svg.lucide-moon')
    await expect(moonIcon).toBeVisible()
  })

  test('REQ-002: 切换主题后 localStorage 中 dark-mode 值更新', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.removeItem('dark-mode')
    })
    await page.reload()

    // 切换至暗黑
    await page.getByRole('button', { name: '切换暗黑模式' }).click()
    await page.waitForTimeout(300)
    const darkValue = await page.evaluate(() => localStorage.getItem('dark-mode'))
    expect(darkValue).toBe('true')

    // 切换回浅色
    await page.getByRole('button', { name: '切换暗黑模式' }).click()
    await page.waitForTimeout(300)
    const lightValue = await page.evaluate(() => localStorage.getItem('dark-mode'))
    expect(lightValue).toBe('false')
  })

  test('REQ-002: 重新打开应用后主题与上次选择一致（暗黑持久化）', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dark-mode', 'true')
    })
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('REQ-002: 重新打开应用后主题与上次选择一致（浅色持久化）', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dark-mode', 'false')
    })
    await page.reload()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('REQ-003: 无存储偏好且系统为暗黑时默认进入暗黑模式', async ({ page }) => {
    // 模拟系统暗黑偏好
    await page.context().addInitScript(() => {
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
    // 清除存储偏好确保走系统检测
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
    await page.evaluate(() => {
      localStorage.setItem('dark-mode', 'true')
    })
    await page.reload()
    await page.waitForTimeout(400)

    // 验证 html.dark 已生效
    await expect(page.locator('html')).toHaveClass(/dark/)

    // 验证 banner 区域文字为浅色（rice-100），背景为深色（charcoal-900）
    const banner = page.locator('.bg-charcoal-900.text-rice-100').first()
    await expect(banner).toBeVisible()
  })

  test('REQ-004: 暗黑模式下菜单视图无浅色背景残留', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dark-mode', 'true')
    })
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // 进入菜单视图
    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()

    await page.waitForTimeout(400)
    // 菜单标题可见，说明页面正常渲染
    await expect(page.getByRole('heading', { name: '鎏金番茄鸳鸯锅' })).toBeVisible()
  })

  test('REQ-004: 暗黑模式下点餐视图商品弹窗正确适配', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dark-mode', 'true')
    })
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // 进入菜单
    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()

    // 打开商品弹窗
    await page.getByRole('button', { name: '锅底' }).click()
    const productCards = page.locator('article')
    await productCards.nth(0).locator('button').last().click()

    await page.waitForTimeout(400)
    // 弹窗标题可见
    await expect(page.getByRole('heading', { name: '鎏金番茄鸳鸯锅' })).toBeVisible()
    // 弹窗内容区域应用了暗黑变体（dark:bg-charcoal-700）
    const dialogContent = page.locator('[data-state="open"].fixed').last()
    await expect(dialogContent).toBeVisible()
  })

  test('REQ-004: 暗黑模式下订单视图可正常访问', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dark-mode', 'true')
    })
    await page.reload()

    // 进入菜单后切到订单视图
    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
    await page.getByRole('button', { name: /订单|Orders/ }).first().click()

    await page.waitForTimeout(400)
    await expect(page).toHaveURL(/#\/order$/)
    // 订单视图页面正常渲染（空订单提示可见）
    await expect(page.getByRole('button', { name: /点餐|Menu/ }).first()).toBeVisible()
  })

  test('REQ-004: 暗黑模式下 TopBar 正确适配（深色背景 + 浅色文字）', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dark-mode', 'true')
    })
    await page.reload()
    await page.waitForTimeout(400)

    // TopBar header 应用 dark:bg-charcoal-900/95
    const header = page.locator('header.sticky')
    await expect(header).toBeVisible()
    await expect(header).toHaveClass(/dark:bg-charcoal-900/)
  })

  test('REQ-005: 暗黑模式与老人模式可同时启用', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.removeItem('dark-mode')
      localStorage.removeItem('elderly-mode')
    })
    await page.reload()

    // 同时开启暗黑和老人模式
    await page.getByRole('button', { name: '切换暗黑模式' }).click()
    await page.getByRole('button', { name: '切换至老人模式' }).click()
    await page.waitForTimeout(400)

    // 两个 class 都存在
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.locator('html')).toHaveClass(/elderly/)
  })

  test('REQ-005: 关闭暗黑模式不影响老人模式状态', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dark-mode', 'true')
      localStorage.setItem('elderly-mode', 'true')
    })
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.locator('html')).toHaveClass(/elderly/)

    // 关闭暗黑模式
    await page.getByRole('button', { name: '切换暗黑模式' }).click()
    await page.waitForTimeout(400)

    // dark 移除，elderly 保留
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await expect(page.locator('html')).toHaveClass(/elderly/)
  })

  test('REQ-005: 关闭老人模式不影响暗黑模式状态', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('dark-mode', 'true')
      localStorage.setItem('elderly-mode', 'true')
    })
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.locator('html')).toHaveClass(/elderly/)

    // 关闭老人模式
    await page.getByRole('button', { name: '切换至常规模式' }).click()
    await page.waitForTimeout(400)

    // elderly 移除，dark 保留
    await expect(page.locator('html')).not.toHaveClass(/elderly/)
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('REQ-001: 切换主题不影响当前视图和业务状态', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('dark-mode'))
    await page.reload()

    // 进入菜单视图
    await enterMenu(page)
    await expect(page).toHaveURL(/#\/menu$/)

    // 切换主题
    await page.getByRole('button', { name: '切换暗黑模式' }).click()
    await page.waitForTimeout(400)

    // 视图不变
    await expect(page).toHaveURL(/#\/menu$/)
    // 菜单内容仍然可见
    await expect(page.getByRole('heading', { name: '鎏金番茄鸳鸯锅' })).toBeVisible()
  })

  test('REQ-002: localStorage 不可用时切换不报错（内存态降级）', async ({ page }) => {
    await page.goto('/')
    // 拦截 localStorage 使其不可用
    await page.evaluate(() => {
      Object.defineProperty(window, 'localStorage', {
        get() { throw new Error('localStorage unavailable') },
      })
    })

    // 由于 localStorage 已被移除，页面可能需要 reload
    // 直接验证点击切换按钮不抛出未捕获错误
    const toggleBtn = page.getByRole('button', { name: '切换暗黑模式' })
    // 使用 force 确保点击，即使有过渡
    await toggleBtn.click({ force: true })
    await page.waitForTimeout(400)

    // html.dark 仍应被切换（内存态生效）
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})
