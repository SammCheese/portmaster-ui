import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { forkJoin, Observable } from "rxjs";
import { map, mergeMap } from "rxjs/operators";
import { environment as env } from '../../environments/environment';
import { AppProfileService } from "./app-profile.service";
import { AppProfile } from "./app-profile.types";
import { DNSContext, IPScope, Reason, TLSContext, TunnelContext, Verdict } from "./network.types";
import { PortapiService } from "./portapi.service";

export interface FieldSelect {
  field: string;
}

export interface Count {
  $count: {
    field: string;
    distinct?: boolean;
    as?: string;
  }
}

export interface Sum {
  $sum: {
    condition: Condition;
    as: string;
    distinct?: boolean;
  }
}

export interface Distinct {
  $distinct: string;
}

export type Select = FieldSelect | Count | Distinct | Sum;

export interface Equal {
  $eq: any;
}

export interface NotEqual {
  $ne: any;
}

export interface Like {
  $like: string;
}

export interface In {
  $in: any[];
}

export interface NotIn {
  $notin: string[];
}

export type Matcher = Equal | NotEqual | Like | In | NotIn;

export interface OrderBy {
  field: string;
  desc?: boolean;
}

export interface Condition {
  [key: string]: string | Matcher | (string | Matcher)[];
}

export interface BatchQuery {
  [key: string]: Query;
}

type BatchResult<T extends BatchQuery> = {
  [key in keyof T]: {
    results: { [field: string]: any }[];
    error?: string;
  }
}

export interface TextSearch {
  fields: string[];
  value: string;
}

export interface Query {
  select?: string | Select | (Select | string)[];
  query?: Condition;
  orderBy?: string | OrderBy | (OrderBy | string)[];
  textSearch?: TextSearch;
  groupBy?: string[];
  pageSize?: number;
  page?: number;
}

export interface NetqueryConnection {
  id: string;
  allowed: boolean;
  profile: string;
  path: string;
  type: 'dns' | 'ip';
  external: boolean;
  ip_version: number;
  ip_protocol: number;
  local_ip: string;
  local_port: number;
  remote_ip: string;
  remote_port: number;
  domain: string;
  country: string;
  asn: number;
  as_owner: string;
  latitude: number;
  longitude: number;
  scope: IPScope;
  verdict: Verdict;
  started: string;
  ended: string;
  tunneled: boolean;
  encrypted: boolean;
  internal: boolean;
  direction: 'inbound' | 'outbound';
  profile_revision: number;
  exit_node?: string;
  extra_data?: {
    pid?: number;
    cname?: string[];
    blockedByLists?: string[];
    blockedEntities?: string[];
    reason?: Reason;
    tunnel?: TunnelContext;
    dns?: DNSContext;
    tls?: TLSContext;
  };

  profile_name: string;
  spn_used: boolean;
  active: boolean;
}

export interface ChartResult {
  timestamp: number;
  value: number;
  countBlocked: number;
}

export interface QueryResult extends Partial<NetqueryConnection> {
  [key: string]: any;
}

export interface IProfileStats {
  ID: string;
  Name: string;

  size: number;
  empty: boolean;
  countAllowed: number;
  countUnpermitted: number;
  countAliveConnections: number;
}

@Injectable({ providedIn: 'root' })
export class Netquery {
  constructor(
    private http: HttpClient,
    private profileService: AppProfileService,
    private portapi: PortapiService,
  ) { }

  query(query: Query): Observable<QueryResult[]> {
    return this.http.post<{ results: QueryResult[] }>(`${env.httpAPI}/v1/netquery/query`, query)
      .pipe(map(res => res.results || []));
  }

  activeConnectionChart(cond: Condition, textSearch?: TextSearch): Observable<ChartResult[]> {
    return this.http.post<{ results: ChartResult[] }>(`${env.httpAPI}/v1/netquery/charts/connection-active`, {
      query: cond,
      textSearch,
    })
      .pipe(map(res => {
        const now = new Date();

        let data: ChartResult[] = [];

        let lastPoint: ChartResult | null = {
          timestamp: Math.floor(now.getTime() / 1000 - 600),
          value: 0,
          countBlocked: 0,
        };
        res.results?.forEach(point => {
          if (!!lastPoint && lastPoint.timestamp < (point.timestamp - 10)) {
            for (let i = lastPoint.timestamp; i < point.timestamp; i += 10) {
              data.push({
                timestamp: i,
                value: 0,
                countBlocked: 0,
              })
            }
          }
          data.push(point);
          lastPoint = point;
        })

        const lastPointTs = Math.round(now.getTime() / 1000);
        if (!!lastPoint && lastPoint.timestamp < (lastPointTs - 20)) {
          for (let i = lastPoint.timestamp; i < lastPointTs; i += 20) {
            data.push({
              timestamp: i,
              value: 0,
              countBlocked: 0
            })
          }
        }

        return data;
      }));
  }

  getActiveProfileIDs(): Observable<string[]> {
    return this.query({
      select: [
        'profile',
      ],
      groupBy: [
        'profile',
      ],
    }).pipe(
      map(result => {
        return result.map(res => res.profile!);
      })
    )
  }

  getActiveProfiles(): Observable<AppProfile[]> {
    return this.getActiveProfileIDs()
      .pipe(
        mergeMap(profiles => forkJoin(profiles.map(pid => this.profileService.getAppProfile(pid))))
      )
  }

  getProfileStats(query?: Condition): Observable<IProfileStats[]> {
    return forkJoin({

      verdicts: this.query({
        select: [
          'profile',
          'verdict',
          { $count: { field: '*', as: 'totalCount' } },
        ],
        groupBy: [
          'profile',
          'verdict',
        ],
        query: query,
      }),

      conns: this.query({
        select: [
          'profile',
          { $count: { field: '*', as: 'totalCount' } },
          { $count: { field: 'ended', as: 'countEnded' } },
        ],
        groupBy: [
          'profile',
        ],
        query: query,
      })

    }).pipe(
      map(result => {
        let statsMap = new Map<string, IProfileStats>();
        result.verdicts?.forEach((res: any) => {
          const id = res.profile;
          let stats = statsMap.get(id) || {
            ID: res.profile,
            Name: 'TODO',
            countAliveConnections: 0,
            countAllowed: 0,
            countUnpermitted: 0,
            empty: true,
            size: 0
          };

          switch (res.verdict) {
            case Verdict.Accept:
            case Verdict.RerouteToNs:
            case Verdict.RerouteToTunnel:
            case Verdict.Undeterminable:
              stats.size += res.totalCount
              stats.countAllowed += res.totalCount;
              break;

            case Verdict.Block:
            case Verdict.Drop:
            case Verdict.Failed:
            case Verdict.Undecided:
              stats.size += res.totalCount
              stats.countUnpermitted += res.totalCount;
              break;
          }

          statsMap.set(id, stats);
          stats.empty = stats.size == 0;
        })

        result.conns?.forEach(res => {
          let stats = statsMap.get(res.profile!)!;

          stats.countAliveConnections = res.totalCount - res.countEnded;
        })

        return Array.from(statsMap.values())
      }),
      mergeMap(stats => {
        return forkJoin(stats.map(p => this.profileService.getAppProfile(p.ID)))
          .pipe(
            map(profiles => {
              let lm = new Map<string, IProfileStats>();
              stats.forEach(stat => lm.set(stat.ID, stat));

              profiles.forEach(p => {
                let stat = lm.get(`${p.Source}/${p.ID}`)
                if (!stat) {
                  return;
                }

                stat.Name = p.Name
              })

              return Array.from(lm.values())
            })
          )
      })
    )
  }
}