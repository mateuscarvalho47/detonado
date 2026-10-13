import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

type PageHeaderProps = {
	overline: string;
	title: string;
	subtitle?: ReactNode;
};

export function PageHeader({ overline, title, subtitle }: PageHeaderProps) {
	return (
		<header>
			<div className={styles.overline}>{overline}</div>
			<h1 className={styles.title}>{title}</h1>
			{subtitle && <p className={styles.subtitle}>{subtitle}</p>}
		</header>
	);
}
