import { test, expect } from '@playwright/test';

test.describe('GlossaHub v2.0 E2E Core Flow (TASK-1401)', () => {
  test('1. 多语言矩阵大表渲染与多维过滤', async ({ page }) => {
    await page.goto('/');

    // 验证标题与顶栏
    await expect(page.locator('text=GlossaHub')).toBeVisible();
    await expect(page.locator('text=词条多语言矩阵大盘')).toBeVisible();

    // 验证指标卡
    await expect(page.locator('text=词条总数')).toBeVisible();
    await expect(page.locator('text=全语种就绪')).toBeVisible();

    // 搜索输入过滤
    const searchInput = page.locator('input[placeholder*="搜索 KW 宏名"]');
    await searchInput.fill('KW_STOP_RIDE');
    await expect(page.locator('text=KW_STOP_RIDE')).toBeVisible();
  });

  test('2. 浅色模式与深色模式无缝切换', async ({ page }) => {
    await page.goto('/');

    // 查找主题切换按钮
    const themeBtn = page.locator('button[title*="切换"]');
    await expect(themeBtn).toBeVisible();

    // 点击切换为浅色
    await themeBtn.click();
    await expect(page.locator('html')).toHaveClass(/light/);

    // 再次点击切换为深色
    await themeBtn.click();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('3. CAT 纯键盘译员工作台与 TM 资产采纳', async ({ page }) => {
    await page.goto('/');

    // 点击侧栏进入 CAT 工作台
    await page.locator('button:has-text("CAT 译员工作台")').click();

    // 验证 3-Pane CAT 页面呈现
    await expect(page.locator('[data-testid="cat-studio-three-pane"]')).toBeVisible();
    await expect(page.locator('text=待办任务清单')).toBeVisible();

    // 验证翻译记忆库采纳按钮存在
    const tmBtn = page.locator('button:has-text("采纳 TM 记忆库译文")');
    await expect(tmBtn).toBeVisible();
  });

  test('4. 固件版本差分对比与不可变变更审计时光机', async ({ page }) => {
    await page.goto('/');

    // 切换至版本 Diff 页面
    await page.locator('button:has-text("版本对比 Diff")').click();
    await expect(page.locator('text=版本差分比对引擎')).toBeVisible();

    // 切换至变更审计页面
    await page.locator('button:has-text("变更审计与时光机")').click();
    await expect(page.locator('text=不可变变更审计流水与时光机')).toBeVisible();
    await expect(page.locator('text=时光机回退')).first().toBeVisible();
  });
});
