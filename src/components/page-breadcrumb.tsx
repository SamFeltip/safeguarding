import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';

export function PageBreadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={item.label}>
            {index > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem className="min-w-0 max-w-full">
              {item.to ? (
                <BreadcrumbLink asChild className="min-w-0 truncate" title={item.label}>
                  <Link to={item.to}>{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="min-w-0 truncate" title={item.label}>
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
