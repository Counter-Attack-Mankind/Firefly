import {
	LinkPreset,
	type NavBarConfig,
	type NavBarLink,
	type NavBarSearchConfig,
	NavBarSearchMethod,
} from "../types/config";
import { siteConfig } from "./siteConfig";

// 根据页面开关动态生成导航栏配置
const getDynamicNavBarConfig = (): NavBarConfig => {
	// 基础导航栏链接
	const links: (NavBarLink | LinkPreset)[] = [
		// 主页
		LinkPreset.Home,

		// 归档
		LinkPreset.Archive,
	];

	// 根据配置决定是否添加友链，在siteConfig关闭pages.friends时导航栏不显示友链
	if (siteConfig.pages.friends) {
		links.push(LinkPreset.Friends);
	}

	// 根据配置决定是否添加留言板，在siteConfig关闭pages.guestbook时导航栏不显示留言板
	if (siteConfig.pages.guestbook) {
		links.push(LinkPreset.Guestbook);
	}

	// 我的及其子菜单
	links.push({
		name: "我的",
		url: "/my/",
		icon: "material-symbols:person",
		children: [
			// 根据配置决定是否添加相册，在siteConfig关闭pages.gallery时导航栏不显示相册
			...(siteConfig.pages.gallery ? [LinkPreset.Gallery] : []),

			// 根据配置决定是否添加番组计划，在siteConfig关闭pages.bangumi时导航栏不显示番组计划
			...(siteConfig.pages.bangumi ? [LinkPreset.Bangumi] : []),
		],
	});

	links.push({
		name: "小游戏",
		url: "/games/",
		icon: "material-symbols:sports-esports",
		children: [
			{
				name: "火柴人跑酷",
				url: "/games/stickman/",
				icon: "material-symbols:directions-run",
			},
			{
				name: "大鱼吃小鱼",
				url: "/games/big-fish/",
				icon: "material-symbols:set-meal",
			},
			{
				name: "像素吃豆人",
				url: "/games/pixel-pacman/",
				icon: "material-symbols:stadia-controller",
			},
		],
	});

	// 关于及其子菜单
	links.push({
		name: "关于",
		url: "/content/",
		icon: "material-symbols:info",
		children: [
			// 根据配置决定是否添加赞助，在siteConfig关闭pages.sponsor时导航栏不显示赞助
			...(siteConfig.pages.sponsor ? [LinkPreset.Sponsor] : []),

			// 关于页面
			LinkPreset.About,
		],
	});

	// 自定义导航栏链接,并且支持多级菜单
	links.push({
		name: "链接",
		url: "/links/",
		icon: "material-symbols:link",

		// 子菜单
		children: [
			{
				name: "GitHub",
				url: "https://github.com/CuteLeaf/Firefly",
				external: true,
				icon: "fa7-brands:github",
			},
			{
				name: "Gitee",
				url: "https://gitee.com/CuteLeaf/Firefly",
				external: true,
				icon: "fa7-brands:gitee",
			},
			{
				name: "QQ交流群",
				url: "https://qm.qq.com/q/ZGsFa8qX2G",
				external: true,
				icon: "fa7-brands:qq",
			},
		],
	});

	// 仅返回链接，其它导航搜索相关配置在模块顶层常量中独立导出
	return { links } as NavBarConfig;
};

// 导航搜索配置
export const navBarSearchConfig: NavBarSearchConfig = {
	method: NavBarSearchMethod.PageFind,
};

export const navBarConfig: NavBarConfig = getDynamicNavBarConfig();
