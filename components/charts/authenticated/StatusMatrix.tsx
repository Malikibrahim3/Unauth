import Link from 'next/link';
import { ChartFrame, ChartState } from './ChartFrame';

export type StatusMatrixCell = {
  label: string;
  detail?: string;
  state: 'current' | 'partial' | 'stale' | 'missing' | 'unavailable';
  href?: string;
};

export type StatusMatrixRow = {
  key: string;
  label: string;
  cells: StatusMatrixCell[];
};

export function StatusMatrix({
  id,
  question,
  summary,
  columns,
  rows,
  freshness,
}: {
  id: string;
  question: string;
  summary: string;
  columns: string[];
  rows: StatusMatrixRow[];
  freshness?: string;
}) {
  return (
    <ChartFrame id={id} kind="status-matrix" question={question} summary={summary} freshness={freshness} compact>
      {rows.length ? (
        <div className="ua-status-matrix" role="region" aria-label={question} tabIndex={0}>
          <table>
            <thead>
              <tr><th scope="col">Object family</th>{columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.label}</th>
                  {row.cells.map((cell, index) => (
                    <td key={`${row.key}-${columns[index]}`}>
                      {cell.href ? (
                        <Link href={cell.href} className="ua-status-matrix__cell" data-state={cell.state}>
                          <span>{cell.label}</span>{cell.detail ? <small>{cell.detail}</small> : null}
                        </Link>
                      ) : (
                        <span className="ua-status-matrix__cell" data-state={cell.state}>
                          <span>{cell.label}</span>{cell.detail ? <small>{cell.detail}</small> : null}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ua-status-matrix__mobile">
            {columns.map((column, columnIndex) => (
              <section key={column} aria-labelledby={`${id}-mobile-${columnIndex}`}>
                <h3 id={`${id}-mobile-${columnIndex}`}>{column}</h3>
                <dl>
                  {rows.map((row) => {
                    const cell = row.cells[columnIndex];
                    return <div key={row.key}><dt>{row.label}</dt><dd>{cell?.href ? <Link href={cell.href} className="ua-status-matrix__cell" data-state={cell.state}><span>{cell.label}</span>{cell.detail ? <small>{cell.detail}</small> : null}</Link> : cell ? <span className="ua-status-matrix__cell" data-state={cell.state}><span>{cell.label}</span>{cell.detail ? <small>{cell.detail}</small> : null}</span> : <span className="ua-status-matrix__cell" data-state="unavailable"><span>Unavailable</span></span>}</dd></div>;
                  })}
                </dl>
              </section>
            ))}
          </div>
        </div>
      ) : (
        <ChartState kind="unavailable" title="Coverage is unavailable" description="No source-object freshness projection exists for this report scope." />
      )}
    </ChartFrame>
  );
}
