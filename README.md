# 酒店预订静态前端

依据 Figma「7月AI design」的酒店预订区域实现。使用独立 HTML、CSS、JavaScript 文件，无构建步骤和前端运行依赖。所有页面图片、图标和字体均随项目提供。

## 在线访问与维护

- 酒店首页：[GitHub Pages](https://caohongbocaohongbo.github.io/hotel-booking-site/)
- 公共源码仓库：[hotel-booking-site](https://github.com/caohongbocaohongbo/hotel-booking-site)
- 网站从 `main` 分支根目录发布，入口为 `index.html`。更新网页、样式、脚本或 `assets/` 素材后，提交并推送到 `main`，GitHub Pages 会重新发布。
- `output/` 是本地截图和对比产物，不纳入公共仓库。公开站点是功能演示，不接收真实订单或付款。

## 启动

在此文件夹双击 **启动本地预览.command**。程序会选择本机可用端口并打开浏览器；关闭终端窗口即可停止服务。需要电脑已有 Python 3。

也可在此目录运行 `python3 scripts/serve.py`。请通过本地 HTTP 地址浏览；直接双击 HTML 的 `file://` 方式可能阻止浏览器加载 JavaScript 模块。

## 页面与维护位置

| 页面 | 文件 | 独立样式/交互 |
| --- | --- | --- |
| 酒店首页 | `index.html` | `css/home.css`、`js/home.js` |
| 客房列表 | `rooms.html` | `css/rooms.css`、`js/rooms.js` |
| 选择产品 | `products.html` | `css/booking.css`、`js/booking.js` |
| 填写预订 | `booking.html` | `css/booking.css`、`js/booking.js` |
| 订单管理 | `orders.html` | `css/orders.css`、`js/orders.js` |
| 订单详情 | `order-detail.html` | `css/orders.css`、`js/orders.js` |
| 酒店位置 | `location.html` | `css/location.css`、`js/location.js` |
| 客房/酒店照片 | `gallery.html?type=room` / `gallery.html?type=hotel` | `css/gallery.css`、`js/gallery.js` |
| 登录 | `login.html` | `css/login.css`、`js/login.js` |

共用导航、反馈、日期查询和微动效在 `css/base.css`、`js/common.js`；字体声明在 `css/fonts.css`。桌面基准为设计稿原尺寸，并检查 1280px、2560px 与 375×812 的手机布局。

## 日历选择器

共用组件为 `js/calendar.js`、`css/calendar.css`。首页、客房和订单日期范围使用双月选择并确认；产品查询与修改订单的独立日期字段使用单月，选中即收起，无底部确认。手机日期范围以单月翻页显示。

## 酒店图片与产品选择层

- 站点图标保留原有深色圆角底板，内部图形使用交付的 `单.svg` 标志。
- 酒店频道的酒店主图、位置页酒店图和酒店相册统一叠加 `#171A1C`、30% 不透明度蒙层；房型卡片、房型详情和客房相册不叠加该蒙层。
- 选择产品页通过 `from` 参数保留来源页。首页房型入口显示首页作为底层，客房列表入口显示客房列表作为底层；关闭按钮回到同一来源页。
- 填写预订和订单详情的右侧费用卡在桌面滚动时吸顶，回滚至原位置后恢复普通布局；窄屏时回到正文流，避免遮挡内容。
- 产品卡只在整卡悬停或键盘聚焦时显示灰色反馈。产品查询使用日期段日历：桌面双月，手机单月翻页。

## 演示范围

- 产品读取默认使用本地设计示例，具备全局加载条、旧请求取消、失败提示和重试。
- 预订提交只保存到当前浏览器的 `localStorage`（键名 `hotel-booking-orders`），订单列表和详情可读取、修改、取消这些演示订单。没有创建真实订单或收款。
- 默认日期、酒店名、价格及联系方式沿用设计稿，不能视为实时可售数据；直接打开预订页保留设计稿费用示例，经产品按钮进入则按所选方案、日期和间数计算。
- 登录为界面演示：用户名任填，演示密码至少 6 位，验证码为 `4827`。免费注册面板收集公司、联系人、手机号、验证码与两次密码输入，注册验证码同为 `4827`；注册成功仅把手机号带回当前登录页，不保存密码，也不向参考站提交。
- 账单管理、财务管理当前显示带咖啡杯图标的“敬请期待”提示，未提供账单或财务数据操作。
- 位置助手根据本页设施和地址回答固定范围问题；未接入大模型或真实住客评价。地图是原稿矢量示意，导航按钮打开地图搜索。
- 酒店图库保留原稿“共 33 张照片”文字，目前仅含原稿实际提供的 3 张照片及泳池素材，没有补造缺失图片。

## 真实接口接入

只读适配层位于 `js/api.js`。默认 `demo` 模式不访问外部站点，接入真实读取需显式设置 `mode: 'remote'`、`baseURL` 和 `tokenProvider`。不要把账号、密码或令牌写进静态文件；跨域访问可能需要同源代理。

参考站验证码尚未由用户完成，因此真实酒店、房型、库存和图片返回值没有经过登录核验。

## 本地验证资料

本地截图、视觉对比结果和测试记录保留在桌面交付文件夹中。公共仓库仅包含运行网站所需的源码、素材和本地预览脚本。

字体使用对应 OFL 开源许可证，来源与校验信息保存在 `assets/fonts/`。
