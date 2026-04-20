
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Application
 * 
 */
export type Application = $Result.DefaultSelection<Prisma.$ApplicationPayload>
/**
 * Model Runtime
 * 
 */
export type Runtime = $Result.DefaultSelection<Prisma.$RuntimePayload>
/**
 * Model AiProvider
 * 
 */
export type AiProvider = $Result.DefaultSelection<Prisma.$AiProviderPayload>
/**
 * Model AiAgent
 * 
 */
export type AiAgent = $Result.DefaultSelection<Prisma.$AiAgentPayload>
/**
 * Model AiTool
 * 
 */
export type AiTool = $Result.DefaultSelection<Prisma.$AiToolPayload>
/**
 * Model AiAgentTool
 * 
 */
export type AiAgentTool = $Result.DefaultSelection<Prisma.$AiAgentToolPayload>
/**
 * Model ScanRun
 * 
 */
export type ScanRun = $Result.DefaultSelection<Prisma.$ScanRunPayload>
/**
 * Model ScanTactic
 * 
 */
export type ScanTactic = $Result.DefaultSelection<Prisma.$ScanTacticPayload>
/**
 * Model ScanFinding
 * 
 */
export type ScanFinding = $Result.DefaultSelection<Prisma.$ScanFindingPayload>
/**
 * Model ScanAuditEntry
 * 
 */
export type ScanAuditEntry = $Result.DefaultSelection<Prisma.$ScanAuditEntryPayload>
/**
 * Model EscalationRoute
 * 
 */
export type EscalationRoute = $Result.DefaultSelection<Prisma.$EscalationRoutePayload>
/**
 * Model EscalationRouteFinding
 * 
 */
export type EscalationRouteFinding = $Result.DefaultSelection<Prisma.$EscalationRouteFindingPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const ApplicationEnvironment: {
  production: 'production',
  staging: 'staging',
  development: 'development'
};

export type ApplicationEnvironment = (typeof ApplicationEnvironment)[keyof typeof ApplicationEnvironment]


export const ApplicationStatus: {
  active: 'active',
  investigating: 'investigating',
  archived: 'archived'
};

export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus]


export const RuntimeServiceType: {
  gateway: 'gateway',
  api: 'api',
  worker: 'worker',
  database: 'database',
  queue: 'queue',
  storage: 'storage',
  other: 'other'
};

export type RuntimeServiceType = (typeof RuntimeServiceType)[keyof typeof RuntimeServiceType]


export const RuntimeProvider: {
  aws: 'aws',
  gcp: 'gcp',
  azure: 'azure',
  on_prem: 'on_prem',
  docker: 'docker',
  vercel: 'vercel',
  other: 'other'
};

export type RuntimeProvider = (typeof RuntimeProvider)[keyof typeof RuntimeProvider]


export const RuntimeStatus: {
  healthy: 'healthy',
  degraded: 'degraded',
  retired: 'retired'
};

export type RuntimeStatus = (typeof RuntimeStatus)[keyof typeof RuntimeStatus]


export const AiProviderKind: {
  local: 'local',
  anthropic: 'anthropic'
};

export type AiProviderKind = (typeof AiProviderKind)[keyof typeof AiProviderKind]


export const AiProviderStatus: {
  active: 'active',
  inactive: 'inactive',
  error: 'error'
};

export type AiProviderStatus = (typeof AiProviderStatus)[keyof typeof AiProviderStatus]


export const AiAgentStatus: {
  draft: 'draft',
  active: 'active',
  archived: 'archived'
};

export type AiAgentStatus = (typeof AiAgentStatus)[keyof typeof AiAgentStatus]


export const AiToolSource: {
  system: 'system',
  custom: 'custom'
};

export type AiToolSource = (typeof AiToolSource)[keyof typeof AiToolSource]


export const AiToolStatus: {
  active: 'active',
  inactive: 'inactive',
  missing: 'missing',
  manual: 'manual'
};

export type AiToolStatus = (typeof AiToolStatus)[keyof typeof AiToolStatus]


export const ScanRunStatus: {
  pending: 'pending',
  running: 'running',
  complete: 'complete',
  aborted: 'aborted'
};

export type ScanRunStatus = (typeof ScanRunStatus)[keyof typeof ScanRunStatus]


export const ScanTacticStatus: {
  pending: 'pending',
  in_progress: 'in_progress',
  complete: 'complete',
  skipped: 'skipped'
};

export type ScanTacticStatus = (typeof ScanTacticStatus)[keyof typeof ScanTacticStatus]

}

export type ApplicationEnvironment = $Enums.ApplicationEnvironment

export const ApplicationEnvironment: typeof $Enums.ApplicationEnvironment

export type ApplicationStatus = $Enums.ApplicationStatus

export const ApplicationStatus: typeof $Enums.ApplicationStatus

export type RuntimeServiceType = $Enums.RuntimeServiceType

export const RuntimeServiceType: typeof $Enums.RuntimeServiceType

export type RuntimeProvider = $Enums.RuntimeProvider

export const RuntimeProvider: typeof $Enums.RuntimeProvider

export type RuntimeStatus = $Enums.RuntimeStatus

export const RuntimeStatus: typeof $Enums.RuntimeStatus

export type AiProviderKind = $Enums.AiProviderKind

export const AiProviderKind: typeof $Enums.AiProviderKind

export type AiProviderStatus = $Enums.AiProviderStatus

export const AiProviderStatus: typeof $Enums.AiProviderStatus

export type AiAgentStatus = $Enums.AiAgentStatus

export const AiAgentStatus: typeof $Enums.AiAgentStatus

export type AiToolSource = $Enums.AiToolSource

export const AiToolSource: typeof $Enums.AiToolSource

export type AiToolStatus = $Enums.AiToolStatus

export const AiToolStatus: typeof $Enums.AiToolStatus

export type ScanRunStatus = $Enums.ScanRunStatus

export const ScanRunStatus: typeof $Enums.ScanRunStatus

export type ScanTacticStatus = $Enums.ScanTacticStatus

export const ScanTacticStatus: typeof $Enums.ScanTacticStatus

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Applications
 * const applications = await prisma.application.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Applications
   * const applications = await prisma.application.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.application`: Exposes CRUD operations for the **Application** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Applications
    * const applications = await prisma.application.findMany()
    * ```
    */
  get application(): Prisma.ApplicationDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.runtime`: Exposes CRUD operations for the **Runtime** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Runtimes
    * const runtimes = await prisma.runtime.findMany()
    * ```
    */
  get runtime(): Prisma.RuntimeDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.aiProvider`: Exposes CRUD operations for the **AiProvider** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AiProviders
    * const aiProviders = await prisma.aiProvider.findMany()
    * ```
    */
  get aiProvider(): Prisma.AiProviderDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.aiAgent`: Exposes CRUD operations for the **AiAgent** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AiAgents
    * const aiAgents = await prisma.aiAgent.findMany()
    * ```
    */
  get aiAgent(): Prisma.AiAgentDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.aiTool`: Exposes CRUD operations for the **AiTool** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AiTools
    * const aiTools = await prisma.aiTool.findMany()
    * ```
    */
  get aiTool(): Prisma.AiToolDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.aiAgentTool`: Exposes CRUD operations for the **AiAgentTool** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AiAgentTools
    * const aiAgentTools = await prisma.aiAgentTool.findMany()
    * ```
    */
  get aiAgentTool(): Prisma.AiAgentToolDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.scanRun`: Exposes CRUD operations for the **ScanRun** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ScanRuns
    * const scanRuns = await prisma.scanRun.findMany()
    * ```
    */
  get scanRun(): Prisma.ScanRunDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.scanTactic`: Exposes CRUD operations for the **ScanTactic** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ScanTactics
    * const scanTactics = await prisma.scanTactic.findMany()
    * ```
    */
  get scanTactic(): Prisma.ScanTacticDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.scanFinding`: Exposes CRUD operations for the **ScanFinding** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ScanFindings
    * const scanFindings = await prisma.scanFinding.findMany()
    * ```
    */
  get scanFinding(): Prisma.ScanFindingDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.scanAuditEntry`: Exposes CRUD operations for the **ScanAuditEntry** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ScanAuditEntries
    * const scanAuditEntries = await prisma.scanAuditEntry.findMany()
    * ```
    */
  get scanAuditEntry(): Prisma.ScanAuditEntryDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.escalationRoute`: Exposes CRUD operations for the **EscalationRoute** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more EscalationRoutes
    * const escalationRoutes = await prisma.escalationRoute.findMany()
    * ```
    */
  get escalationRoute(): Prisma.EscalationRouteDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.escalationRouteFinding`: Exposes CRUD operations for the **EscalationRouteFinding** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more EscalationRouteFindings
    * const escalationRouteFindings = await prisma.escalationRouteFinding.findMany()
    * ```
    */
  get escalationRouteFinding(): Prisma.EscalationRouteFindingDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.3
   * Query Engine version: c2990dca591cba766e3b7ef5d9e8a84796e47ab7
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Application: 'Application',
    Runtime: 'Runtime',
    AiProvider: 'AiProvider',
    AiAgent: 'AiAgent',
    AiTool: 'AiTool',
    AiAgentTool: 'AiAgentTool',
    ScanRun: 'ScanRun',
    ScanTactic: 'ScanTactic',
    ScanFinding: 'ScanFinding',
    ScanAuditEntry: 'ScanAuditEntry',
    EscalationRoute: 'EscalationRoute',
    EscalationRouteFinding: 'EscalationRouteFinding'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "application" | "runtime" | "aiProvider" | "aiAgent" | "aiTool" | "aiAgentTool" | "scanRun" | "scanTactic" | "scanFinding" | "scanAuditEntry" | "escalationRoute" | "escalationRouteFinding"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Application: {
        payload: Prisma.$ApplicationPayload<ExtArgs>
        fields: Prisma.ApplicationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ApplicationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ApplicationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationPayload>
          }
          findFirst: {
            args: Prisma.ApplicationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ApplicationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationPayload>
          }
          findMany: {
            args: Prisma.ApplicationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationPayload>[]
          }
          create: {
            args: Prisma.ApplicationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationPayload>
          }
          createMany: {
            args: Prisma.ApplicationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ApplicationCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationPayload>[]
          }
          delete: {
            args: Prisma.ApplicationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationPayload>
          }
          update: {
            args: Prisma.ApplicationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationPayload>
          }
          deleteMany: {
            args: Prisma.ApplicationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ApplicationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ApplicationUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationPayload>[]
          }
          upsert: {
            args: Prisma.ApplicationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationPayload>
          }
          aggregate: {
            args: Prisma.ApplicationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateApplication>
          }
          groupBy: {
            args: Prisma.ApplicationGroupByArgs<ExtArgs>
            result: $Utils.Optional<ApplicationGroupByOutputType>[]
          }
          count: {
            args: Prisma.ApplicationCountArgs<ExtArgs>
            result: $Utils.Optional<ApplicationCountAggregateOutputType> | number
          }
        }
      }
      Runtime: {
        payload: Prisma.$RuntimePayload<ExtArgs>
        fields: Prisma.RuntimeFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RuntimeFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuntimePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RuntimeFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuntimePayload>
          }
          findFirst: {
            args: Prisma.RuntimeFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuntimePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RuntimeFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuntimePayload>
          }
          findMany: {
            args: Prisma.RuntimeFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuntimePayload>[]
          }
          create: {
            args: Prisma.RuntimeCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuntimePayload>
          }
          createMany: {
            args: Prisma.RuntimeCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RuntimeCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuntimePayload>[]
          }
          delete: {
            args: Prisma.RuntimeDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuntimePayload>
          }
          update: {
            args: Prisma.RuntimeUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuntimePayload>
          }
          deleteMany: {
            args: Prisma.RuntimeDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RuntimeUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RuntimeUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuntimePayload>[]
          }
          upsert: {
            args: Prisma.RuntimeUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuntimePayload>
          }
          aggregate: {
            args: Prisma.RuntimeAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRuntime>
          }
          groupBy: {
            args: Prisma.RuntimeGroupByArgs<ExtArgs>
            result: $Utils.Optional<RuntimeGroupByOutputType>[]
          }
          count: {
            args: Prisma.RuntimeCountArgs<ExtArgs>
            result: $Utils.Optional<RuntimeCountAggregateOutputType> | number
          }
        }
      }
      AiProvider: {
        payload: Prisma.$AiProviderPayload<ExtArgs>
        fields: Prisma.AiProviderFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AiProviderFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiProviderPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AiProviderFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiProviderPayload>
          }
          findFirst: {
            args: Prisma.AiProviderFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiProviderPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AiProviderFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiProviderPayload>
          }
          findMany: {
            args: Prisma.AiProviderFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiProviderPayload>[]
          }
          create: {
            args: Prisma.AiProviderCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiProviderPayload>
          }
          createMany: {
            args: Prisma.AiProviderCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AiProviderCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiProviderPayload>[]
          }
          delete: {
            args: Prisma.AiProviderDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiProviderPayload>
          }
          update: {
            args: Prisma.AiProviderUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiProviderPayload>
          }
          deleteMany: {
            args: Prisma.AiProviderDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AiProviderUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AiProviderUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiProviderPayload>[]
          }
          upsert: {
            args: Prisma.AiProviderUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiProviderPayload>
          }
          aggregate: {
            args: Prisma.AiProviderAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAiProvider>
          }
          groupBy: {
            args: Prisma.AiProviderGroupByArgs<ExtArgs>
            result: $Utils.Optional<AiProviderGroupByOutputType>[]
          }
          count: {
            args: Prisma.AiProviderCountArgs<ExtArgs>
            result: $Utils.Optional<AiProviderCountAggregateOutputType> | number
          }
        }
      }
      AiAgent: {
        payload: Prisma.$AiAgentPayload<ExtArgs>
        fields: Prisma.AiAgentFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AiAgentFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AiAgentFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentPayload>
          }
          findFirst: {
            args: Prisma.AiAgentFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AiAgentFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentPayload>
          }
          findMany: {
            args: Prisma.AiAgentFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentPayload>[]
          }
          create: {
            args: Prisma.AiAgentCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentPayload>
          }
          createMany: {
            args: Prisma.AiAgentCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AiAgentCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentPayload>[]
          }
          delete: {
            args: Prisma.AiAgentDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentPayload>
          }
          update: {
            args: Prisma.AiAgentUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentPayload>
          }
          deleteMany: {
            args: Prisma.AiAgentDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AiAgentUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AiAgentUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentPayload>[]
          }
          upsert: {
            args: Prisma.AiAgentUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentPayload>
          }
          aggregate: {
            args: Prisma.AiAgentAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAiAgent>
          }
          groupBy: {
            args: Prisma.AiAgentGroupByArgs<ExtArgs>
            result: $Utils.Optional<AiAgentGroupByOutputType>[]
          }
          count: {
            args: Prisma.AiAgentCountArgs<ExtArgs>
            result: $Utils.Optional<AiAgentCountAggregateOutputType> | number
          }
        }
      }
      AiTool: {
        payload: Prisma.$AiToolPayload<ExtArgs>
        fields: Prisma.AiToolFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AiToolFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiToolPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AiToolFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiToolPayload>
          }
          findFirst: {
            args: Prisma.AiToolFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiToolPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AiToolFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiToolPayload>
          }
          findMany: {
            args: Prisma.AiToolFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiToolPayload>[]
          }
          create: {
            args: Prisma.AiToolCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiToolPayload>
          }
          createMany: {
            args: Prisma.AiToolCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AiToolCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiToolPayload>[]
          }
          delete: {
            args: Prisma.AiToolDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiToolPayload>
          }
          update: {
            args: Prisma.AiToolUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiToolPayload>
          }
          deleteMany: {
            args: Prisma.AiToolDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AiToolUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AiToolUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiToolPayload>[]
          }
          upsert: {
            args: Prisma.AiToolUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiToolPayload>
          }
          aggregate: {
            args: Prisma.AiToolAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAiTool>
          }
          groupBy: {
            args: Prisma.AiToolGroupByArgs<ExtArgs>
            result: $Utils.Optional<AiToolGroupByOutputType>[]
          }
          count: {
            args: Prisma.AiToolCountArgs<ExtArgs>
            result: $Utils.Optional<AiToolCountAggregateOutputType> | number
          }
        }
      }
      AiAgentTool: {
        payload: Prisma.$AiAgentToolPayload<ExtArgs>
        fields: Prisma.AiAgentToolFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AiAgentToolFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentToolPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AiAgentToolFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentToolPayload>
          }
          findFirst: {
            args: Prisma.AiAgentToolFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentToolPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AiAgentToolFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentToolPayload>
          }
          findMany: {
            args: Prisma.AiAgentToolFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentToolPayload>[]
          }
          create: {
            args: Prisma.AiAgentToolCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentToolPayload>
          }
          createMany: {
            args: Prisma.AiAgentToolCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AiAgentToolCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentToolPayload>[]
          }
          delete: {
            args: Prisma.AiAgentToolDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentToolPayload>
          }
          update: {
            args: Prisma.AiAgentToolUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentToolPayload>
          }
          deleteMany: {
            args: Prisma.AiAgentToolDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AiAgentToolUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AiAgentToolUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentToolPayload>[]
          }
          upsert: {
            args: Prisma.AiAgentToolUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiAgentToolPayload>
          }
          aggregate: {
            args: Prisma.AiAgentToolAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAiAgentTool>
          }
          groupBy: {
            args: Prisma.AiAgentToolGroupByArgs<ExtArgs>
            result: $Utils.Optional<AiAgentToolGroupByOutputType>[]
          }
          count: {
            args: Prisma.AiAgentToolCountArgs<ExtArgs>
            result: $Utils.Optional<AiAgentToolCountAggregateOutputType> | number
          }
        }
      }
      ScanRun: {
        payload: Prisma.$ScanRunPayload<ExtArgs>
        fields: Prisma.ScanRunFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ScanRunFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanRunPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ScanRunFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanRunPayload>
          }
          findFirst: {
            args: Prisma.ScanRunFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanRunPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ScanRunFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanRunPayload>
          }
          findMany: {
            args: Prisma.ScanRunFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanRunPayload>[]
          }
          create: {
            args: Prisma.ScanRunCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanRunPayload>
          }
          createMany: {
            args: Prisma.ScanRunCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ScanRunCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanRunPayload>[]
          }
          delete: {
            args: Prisma.ScanRunDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanRunPayload>
          }
          update: {
            args: Prisma.ScanRunUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanRunPayload>
          }
          deleteMany: {
            args: Prisma.ScanRunDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ScanRunUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ScanRunUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanRunPayload>[]
          }
          upsert: {
            args: Prisma.ScanRunUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanRunPayload>
          }
          aggregate: {
            args: Prisma.ScanRunAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateScanRun>
          }
          groupBy: {
            args: Prisma.ScanRunGroupByArgs<ExtArgs>
            result: $Utils.Optional<ScanRunGroupByOutputType>[]
          }
          count: {
            args: Prisma.ScanRunCountArgs<ExtArgs>
            result: $Utils.Optional<ScanRunCountAggregateOutputType> | number
          }
        }
      }
      ScanTactic: {
        payload: Prisma.$ScanTacticPayload<ExtArgs>
        fields: Prisma.ScanTacticFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ScanTacticFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanTacticPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ScanTacticFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanTacticPayload>
          }
          findFirst: {
            args: Prisma.ScanTacticFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanTacticPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ScanTacticFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanTacticPayload>
          }
          findMany: {
            args: Prisma.ScanTacticFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanTacticPayload>[]
          }
          create: {
            args: Prisma.ScanTacticCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanTacticPayload>
          }
          createMany: {
            args: Prisma.ScanTacticCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ScanTacticCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanTacticPayload>[]
          }
          delete: {
            args: Prisma.ScanTacticDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanTacticPayload>
          }
          update: {
            args: Prisma.ScanTacticUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanTacticPayload>
          }
          deleteMany: {
            args: Prisma.ScanTacticDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ScanTacticUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ScanTacticUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanTacticPayload>[]
          }
          upsert: {
            args: Prisma.ScanTacticUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanTacticPayload>
          }
          aggregate: {
            args: Prisma.ScanTacticAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateScanTactic>
          }
          groupBy: {
            args: Prisma.ScanTacticGroupByArgs<ExtArgs>
            result: $Utils.Optional<ScanTacticGroupByOutputType>[]
          }
          count: {
            args: Prisma.ScanTacticCountArgs<ExtArgs>
            result: $Utils.Optional<ScanTacticCountAggregateOutputType> | number
          }
        }
      }
      ScanFinding: {
        payload: Prisma.$ScanFindingPayload<ExtArgs>
        fields: Prisma.ScanFindingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ScanFindingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanFindingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ScanFindingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanFindingPayload>
          }
          findFirst: {
            args: Prisma.ScanFindingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanFindingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ScanFindingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanFindingPayload>
          }
          findMany: {
            args: Prisma.ScanFindingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanFindingPayload>[]
          }
          create: {
            args: Prisma.ScanFindingCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanFindingPayload>
          }
          createMany: {
            args: Prisma.ScanFindingCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ScanFindingCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanFindingPayload>[]
          }
          delete: {
            args: Prisma.ScanFindingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanFindingPayload>
          }
          update: {
            args: Prisma.ScanFindingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanFindingPayload>
          }
          deleteMany: {
            args: Prisma.ScanFindingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ScanFindingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ScanFindingUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanFindingPayload>[]
          }
          upsert: {
            args: Prisma.ScanFindingUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanFindingPayload>
          }
          aggregate: {
            args: Prisma.ScanFindingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateScanFinding>
          }
          groupBy: {
            args: Prisma.ScanFindingGroupByArgs<ExtArgs>
            result: $Utils.Optional<ScanFindingGroupByOutputType>[]
          }
          count: {
            args: Prisma.ScanFindingCountArgs<ExtArgs>
            result: $Utils.Optional<ScanFindingCountAggregateOutputType> | number
          }
        }
      }
      ScanAuditEntry: {
        payload: Prisma.$ScanAuditEntryPayload<ExtArgs>
        fields: Prisma.ScanAuditEntryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ScanAuditEntryFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanAuditEntryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ScanAuditEntryFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanAuditEntryPayload>
          }
          findFirst: {
            args: Prisma.ScanAuditEntryFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanAuditEntryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ScanAuditEntryFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanAuditEntryPayload>
          }
          findMany: {
            args: Prisma.ScanAuditEntryFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanAuditEntryPayload>[]
          }
          create: {
            args: Prisma.ScanAuditEntryCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanAuditEntryPayload>
          }
          createMany: {
            args: Prisma.ScanAuditEntryCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ScanAuditEntryCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanAuditEntryPayload>[]
          }
          delete: {
            args: Prisma.ScanAuditEntryDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanAuditEntryPayload>
          }
          update: {
            args: Prisma.ScanAuditEntryUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanAuditEntryPayload>
          }
          deleteMany: {
            args: Prisma.ScanAuditEntryDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ScanAuditEntryUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ScanAuditEntryUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanAuditEntryPayload>[]
          }
          upsert: {
            args: Prisma.ScanAuditEntryUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanAuditEntryPayload>
          }
          aggregate: {
            args: Prisma.ScanAuditEntryAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateScanAuditEntry>
          }
          groupBy: {
            args: Prisma.ScanAuditEntryGroupByArgs<ExtArgs>
            result: $Utils.Optional<ScanAuditEntryGroupByOutputType>[]
          }
          count: {
            args: Prisma.ScanAuditEntryCountArgs<ExtArgs>
            result: $Utils.Optional<ScanAuditEntryCountAggregateOutputType> | number
          }
        }
      }
      EscalationRoute: {
        payload: Prisma.$EscalationRoutePayload<ExtArgs>
        fields: Prisma.EscalationRouteFieldRefs
        operations: {
          findUnique: {
            args: Prisma.EscalationRouteFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRoutePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.EscalationRouteFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRoutePayload>
          }
          findFirst: {
            args: Prisma.EscalationRouteFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRoutePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.EscalationRouteFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRoutePayload>
          }
          findMany: {
            args: Prisma.EscalationRouteFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRoutePayload>[]
          }
          create: {
            args: Prisma.EscalationRouteCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRoutePayload>
          }
          createMany: {
            args: Prisma.EscalationRouteCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.EscalationRouteCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRoutePayload>[]
          }
          delete: {
            args: Prisma.EscalationRouteDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRoutePayload>
          }
          update: {
            args: Prisma.EscalationRouteUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRoutePayload>
          }
          deleteMany: {
            args: Prisma.EscalationRouteDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.EscalationRouteUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.EscalationRouteUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRoutePayload>[]
          }
          upsert: {
            args: Prisma.EscalationRouteUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRoutePayload>
          }
          aggregate: {
            args: Prisma.EscalationRouteAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateEscalationRoute>
          }
          groupBy: {
            args: Prisma.EscalationRouteGroupByArgs<ExtArgs>
            result: $Utils.Optional<EscalationRouteGroupByOutputType>[]
          }
          count: {
            args: Prisma.EscalationRouteCountArgs<ExtArgs>
            result: $Utils.Optional<EscalationRouteCountAggregateOutputType> | number
          }
        }
      }
      EscalationRouteFinding: {
        payload: Prisma.$EscalationRouteFindingPayload<ExtArgs>
        fields: Prisma.EscalationRouteFindingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.EscalationRouteFindingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRouteFindingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.EscalationRouteFindingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRouteFindingPayload>
          }
          findFirst: {
            args: Prisma.EscalationRouteFindingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRouteFindingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.EscalationRouteFindingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRouteFindingPayload>
          }
          findMany: {
            args: Prisma.EscalationRouteFindingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRouteFindingPayload>[]
          }
          create: {
            args: Prisma.EscalationRouteFindingCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRouteFindingPayload>
          }
          createMany: {
            args: Prisma.EscalationRouteFindingCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.EscalationRouteFindingCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRouteFindingPayload>[]
          }
          delete: {
            args: Prisma.EscalationRouteFindingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRouteFindingPayload>
          }
          update: {
            args: Prisma.EscalationRouteFindingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRouteFindingPayload>
          }
          deleteMany: {
            args: Prisma.EscalationRouteFindingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.EscalationRouteFindingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.EscalationRouteFindingUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRouteFindingPayload>[]
          }
          upsert: {
            args: Prisma.EscalationRouteFindingUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EscalationRouteFindingPayload>
          }
          aggregate: {
            args: Prisma.EscalationRouteFindingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateEscalationRouteFinding>
          }
          groupBy: {
            args: Prisma.EscalationRouteFindingGroupByArgs<ExtArgs>
            result: $Utils.Optional<EscalationRouteFindingGroupByOutputType>[]
          }
          count: {
            args: Prisma.EscalationRouteFindingCountArgs<ExtArgs>
            result: $Utils.Optional<EscalationRouteFindingCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    application?: ApplicationOmit
    runtime?: RuntimeOmit
    aiProvider?: AiProviderOmit
    aiAgent?: AiAgentOmit
    aiTool?: AiToolOmit
    aiAgentTool?: AiAgentToolOmit
    scanRun?: ScanRunOmit
    scanTactic?: ScanTacticOmit
    scanFinding?: ScanFindingOmit
    scanAuditEntry?: ScanAuditEntryOmit
    escalationRoute?: EscalationRouteOmit
    escalationRouteFinding?: EscalationRouteFindingOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type ApplicationCountOutputType
   */

  export type ApplicationCountOutputType = {
    runtimes: number
  }

  export type ApplicationCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    runtimes?: boolean | ApplicationCountOutputTypeCountRuntimesArgs
  }

  // Custom InputTypes
  /**
   * ApplicationCountOutputType without action
   */
  export type ApplicationCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicationCountOutputType
     */
    select?: ApplicationCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ApplicationCountOutputType without action
   */
  export type ApplicationCountOutputTypeCountRuntimesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RuntimeWhereInput
  }


  /**
   * Count Type AiProviderCountOutputType
   */

  export type AiProviderCountOutputType = {
    agents: number
  }

  export type AiProviderCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    agents?: boolean | AiProviderCountOutputTypeCountAgentsArgs
  }

  // Custom InputTypes
  /**
   * AiProviderCountOutputType without action
   */
  export type AiProviderCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiProviderCountOutputType
     */
    select?: AiProviderCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * AiProviderCountOutputType without action
   */
  export type AiProviderCountOutputTypeCountAgentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AiAgentWhereInput
  }


  /**
   * Count Type AiAgentCountOutputType
   */

  export type AiAgentCountOutputType = {
    tools: number
  }

  export type AiAgentCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tools?: boolean | AiAgentCountOutputTypeCountToolsArgs
  }

  // Custom InputTypes
  /**
   * AiAgentCountOutputType without action
   */
  export type AiAgentCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgentCountOutputType
     */
    select?: AiAgentCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * AiAgentCountOutputType without action
   */
  export type AiAgentCountOutputTypeCountToolsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AiAgentToolWhereInput
  }


  /**
   * Count Type AiToolCountOutputType
   */

  export type AiToolCountOutputType = {
    agents: number
  }

  export type AiToolCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    agents?: boolean | AiToolCountOutputTypeCountAgentsArgs
  }

  // Custom InputTypes
  /**
   * AiToolCountOutputType without action
   */
  export type AiToolCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiToolCountOutputType
     */
    select?: AiToolCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * AiToolCountOutputType without action
   */
  export type AiToolCountOutputTypeCountAgentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AiAgentToolWhereInput
  }


  /**
   * Count Type ScanRunCountOutputType
   */

  export type ScanRunCountOutputType = {
    scanTactics: number
    scanFindings: number
    scanAuditEntries: number
    escalationRoutes: number
  }

  export type ScanRunCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    scanTactics?: boolean | ScanRunCountOutputTypeCountScanTacticsArgs
    scanFindings?: boolean | ScanRunCountOutputTypeCountScanFindingsArgs
    scanAuditEntries?: boolean | ScanRunCountOutputTypeCountScanAuditEntriesArgs
    escalationRoutes?: boolean | ScanRunCountOutputTypeCountEscalationRoutesArgs
  }

  // Custom InputTypes
  /**
   * ScanRunCountOutputType without action
   */
  export type ScanRunCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanRunCountOutputType
     */
    select?: ScanRunCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ScanRunCountOutputType without action
   */
  export type ScanRunCountOutputTypeCountScanTacticsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ScanTacticWhereInput
  }

  /**
   * ScanRunCountOutputType without action
   */
  export type ScanRunCountOutputTypeCountScanFindingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ScanFindingWhereInput
  }

  /**
   * ScanRunCountOutputType without action
   */
  export type ScanRunCountOutputTypeCountScanAuditEntriesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ScanAuditEntryWhereInput
  }

  /**
   * ScanRunCountOutputType without action
   */
  export type ScanRunCountOutputTypeCountEscalationRoutesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EscalationRouteWhereInput
  }


  /**
   * Count Type ScanTacticCountOutputType
   */

  export type ScanTacticCountOutputType = {
    childTactics: number
    scanFindings: number
  }

  export type ScanTacticCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    childTactics?: boolean | ScanTacticCountOutputTypeCountChildTacticsArgs
    scanFindings?: boolean | ScanTacticCountOutputTypeCountScanFindingsArgs
  }

  // Custom InputTypes
  /**
   * ScanTacticCountOutputType without action
   */
  export type ScanTacticCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanTacticCountOutputType
     */
    select?: ScanTacticCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ScanTacticCountOutputType without action
   */
  export type ScanTacticCountOutputTypeCountChildTacticsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ScanTacticWhereInput
  }

  /**
   * ScanTacticCountOutputType without action
   */
  export type ScanTacticCountOutputTypeCountScanFindingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ScanFindingWhereInput
  }


  /**
   * Count Type ScanFindingCountOutputType
   */

  export type ScanFindingCountOutputType = {
    routeFindings: number
  }

  export type ScanFindingCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    routeFindings?: boolean | ScanFindingCountOutputTypeCountRouteFindingsArgs
  }

  // Custom InputTypes
  /**
   * ScanFindingCountOutputType without action
   */
  export type ScanFindingCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanFindingCountOutputType
     */
    select?: ScanFindingCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ScanFindingCountOutputType without action
   */
  export type ScanFindingCountOutputTypeCountRouteFindingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EscalationRouteFindingWhereInput
  }


  /**
   * Count Type EscalationRouteCountOutputType
   */

  export type EscalationRouteCountOutputType = {
    routeFindings: number
  }

  export type EscalationRouteCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    routeFindings?: boolean | EscalationRouteCountOutputTypeCountRouteFindingsArgs
  }

  // Custom InputTypes
  /**
   * EscalationRouteCountOutputType without action
   */
  export type EscalationRouteCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRouteCountOutputType
     */
    select?: EscalationRouteCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * EscalationRouteCountOutputType without action
   */
  export type EscalationRouteCountOutputTypeCountRouteFindingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EscalationRouteFindingWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Application
   */

  export type AggregateApplication = {
    _count: ApplicationCountAggregateOutputType | null
    _min: ApplicationMinAggregateOutputType | null
    _max: ApplicationMaxAggregateOutputType | null
  }

  export type ApplicationMinAggregateOutputType = {
    id: string | null
    name: string | null
    baseUrl: string | null
    environment: $Enums.ApplicationEnvironment | null
    status: $Enums.ApplicationStatus | null
    lastScannedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ApplicationMaxAggregateOutputType = {
    id: string | null
    name: string | null
    baseUrl: string | null
    environment: $Enums.ApplicationEnvironment | null
    status: $Enums.ApplicationStatus | null
    lastScannedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ApplicationCountAggregateOutputType = {
    id: number
    name: number
    baseUrl: number
    environment: number
    status: number
    lastScannedAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ApplicationMinAggregateInputType = {
    id?: true
    name?: true
    baseUrl?: true
    environment?: true
    status?: true
    lastScannedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ApplicationMaxAggregateInputType = {
    id?: true
    name?: true
    baseUrl?: true
    environment?: true
    status?: true
    lastScannedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ApplicationCountAggregateInputType = {
    id?: true
    name?: true
    baseUrl?: true
    environment?: true
    status?: true
    lastScannedAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ApplicationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Application to aggregate.
     */
    where?: ApplicationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Applications to fetch.
     */
    orderBy?: ApplicationOrderByWithRelationInput | ApplicationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ApplicationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Applications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Applications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Applications
    **/
    _count?: true | ApplicationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ApplicationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ApplicationMaxAggregateInputType
  }

  export type GetApplicationAggregateType<T extends ApplicationAggregateArgs> = {
        [P in keyof T & keyof AggregateApplication]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateApplication[P]>
      : GetScalarType<T[P], AggregateApplication[P]>
  }




  export type ApplicationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ApplicationWhereInput
    orderBy?: ApplicationOrderByWithAggregationInput | ApplicationOrderByWithAggregationInput[]
    by: ApplicationScalarFieldEnum[] | ApplicationScalarFieldEnum
    having?: ApplicationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ApplicationCountAggregateInputType | true
    _min?: ApplicationMinAggregateInputType
    _max?: ApplicationMaxAggregateInputType
  }

  export type ApplicationGroupByOutputType = {
    id: string
    name: string
    baseUrl: string | null
    environment: $Enums.ApplicationEnvironment
    status: $Enums.ApplicationStatus
    lastScannedAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: ApplicationCountAggregateOutputType | null
    _min: ApplicationMinAggregateOutputType | null
    _max: ApplicationMaxAggregateOutputType | null
  }

  type GetApplicationGroupByPayload<T extends ApplicationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ApplicationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ApplicationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ApplicationGroupByOutputType[P]>
            : GetScalarType<T[P], ApplicationGroupByOutputType[P]>
        }
      >
    >


  export type ApplicationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    baseUrl?: boolean
    environment?: boolean
    status?: boolean
    lastScannedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    runtimes?: boolean | Application$runtimesArgs<ExtArgs>
    _count?: boolean | ApplicationCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["application"]>

  export type ApplicationSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    baseUrl?: boolean
    environment?: boolean
    status?: boolean
    lastScannedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["application"]>

  export type ApplicationSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    baseUrl?: boolean
    environment?: boolean
    status?: boolean
    lastScannedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["application"]>

  export type ApplicationSelectScalar = {
    id?: boolean
    name?: boolean
    baseUrl?: boolean
    environment?: boolean
    status?: boolean
    lastScannedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ApplicationOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "baseUrl" | "environment" | "status" | "lastScannedAt" | "createdAt" | "updatedAt", ExtArgs["result"]["application"]>
  export type ApplicationInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    runtimes?: boolean | Application$runtimesArgs<ExtArgs>
    _count?: boolean | ApplicationCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ApplicationIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type ApplicationIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $ApplicationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Application"
    objects: {
      runtimes: Prisma.$RuntimePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      baseUrl: string | null
      environment: $Enums.ApplicationEnvironment
      status: $Enums.ApplicationStatus
      lastScannedAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["application"]>
    composites: {}
  }

  type ApplicationGetPayload<S extends boolean | null | undefined | ApplicationDefaultArgs> = $Result.GetResult<Prisma.$ApplicationPayload, S>

  type ApplicationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ApplicationFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ApplicationCountAggregateInputType | true
    }

  export interface ApplicationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Application'], meta: { name: 'Application' } }
    /**
     * Find zero or one Application that matches the filter.
     * @param {ApplicationFindUniqueArgs} args - Arguments to find a Application
     * @example
     * // Get one Application
     * const application = await prisma.application.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ApplicationFindUniqueArgs>(args: SelectSubset<T, ApplicationFindUniqueArgs<ExtArgs>>): Prisma__ApplicationClient<$Result.GetResult<Prisma.$ApplicationPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Application that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ApplicationFindUniqueOrThrowArgs} args - Arguments to find a Application
     * @example
     * // Get one Application
     * const application = await prisma.application.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ApplicationFindUniqueOrThrowArgs>(args: SelectSubset<T, ApplicationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ApplicationClient<$Result.GetResult<Prisma.$ApplicationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Application that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicationFindFirstArgs} args - Arguments to find a Application
     * @example
     * // Get one Application
     * const application = await prisma.application.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ApplicationFindFirstArgs>(args?: SelectSubset<T, ApplicationFindFirstArgs<ExtArgs>>): Prisma__ApplicationClient<$Result.GetResult<Prisma.$ApplicationPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Application that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicationFindFirstOrThrowArgs} args - Arguments to find a Application
     * @example
     * // Get one Application
     * const application = await prisma.application.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ApplicationFindFirstOrThrowArgs>(args?: SelectSubset<T, ApplicationFindFirstOrThrowArgs<ExtArgs>>): Prisma__ApplicationClient<$Result.GetResult<Prisma.$ApplicationPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Applications that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Applications
     * const applications = await prisma.application.findMany()
     * 
     * // Get first 10 Applications
     * const applications = await prisma.application.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const applicationWithIdOnly = await prisma.application.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ApplicationFindManyArgs>(args?: SelectSubset<T, ApplicationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApplicationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Application.
     * @param {ApplicationCreateArgs} args - Arguments to create a Application.
     * @example
     * // Create one Application
     * const Application = await prisma.application.create({
     *   data: {
     *     // ... data to create a Application
     *   }
     * })
     * 
     */
    create<T extends ApplicationCreateArgs>(args: SelectSubset<T, ApplicationCreateArgs<ExtArgs>>): Prisma__ApplicationClient<$Result.GetResult<Prisma.$ApplicationPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Applications.
     * @param {ApplicationCreateManyArgs} args - Arguments to create many Applications.
     * @example
     * // Create many Applications
     * const application = await prisma.application.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ApplicationCreateManyArgs>(args?: SelectSubset<T, ApplicationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Applications and returns the data saved in the database.
     * @param {ApplicationCreateManyAndReturnArgs} args - Arguments to create many Applications.
     * @example
     * // Create many Applications
     * const application = await prisma.application.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Applications and only return the `id`
     * const applicationWithIdOnly = await prisma.application.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ApplicationCreateManyAndReturnArgs>(args?: SelectSubset<T, ApplicationCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApplicationPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Application.
     * @param {ApplicationDeleteArgs} args - Arguments to delete one Application.
     * @example
     * // Delete one Application
     * const Application = await prisma.application.delete({
     *   where: {
     *     // ... filter to delete one Application
     *   }
     * })
     * 
     */
    delete<T extends ApplicationDeleteArgs>(args: SelectSubset<T, ApplicationDeleteArgs<ExtArgs>>): Prisma__ApplicationClient<$Result.GetResult<Prisma.$ApplicationPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Application.
     * @param {ApplicationUpdateArgs} args - Arguments to update one Application.
     * @example
     * // Update one Application
     * const application = await prisma.application.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ApplicationUpdateArgs>(args: SelectSubset<T, ApplicationUpdateArgs<ExtArgs>>): Prisma__ApplicationClient<$Result.GetResult<Prisma.$ApplicationPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Applications.
     * @param {ApplicationDeleteManyArgs} args - Arguments to filter Applications to delete.
     * @example
     * // Delete a few Applications
     * const { count } = await prisma.application.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ApplicationDeleteManyArgs>(args?: SelectSubset<T, ApplicationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Applications.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Applications
     * const application = await prisma.application.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ApplicationUpdateManyArgs>(args: SelectSubset<T, ApplicationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Applications and returns the data updated in the database.
     * @param {ApplicationUpdateManyAndReturnArgs} args - Arguments to update many Applications.
     * @example
     * // Update many Applications
     * const application = await prisma.application.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Applications and only return the `id`
     * const applicationWithIdOnly = await prisma.application.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ApplicationUpdateManyAndReturnArgs>(args: SelectSubset<T, ApplicationUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApplicationPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Application.
     * @param {ApplicationUpsertArgs} args - Arguments to update or create a Application.
     * @example
     * // Update or create a Application
     * const application = await prisma.application.upsert({
     *   create: {
     *     // ... data to create a Application
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Application we want to update
     *   }
     * })
     */
    upsert<T extends ApplicationUpsertArgs>(args: SelectSubset<T, ApplicationUpsertArgs<ExtArgs>>): Prisma__ApplicationClient<$Result.GetResult<Prisma.$ApplicationPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Applications.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicationCountArgs} args - Arguments to filter Applications to count.
     * @example
     * // Count the number of Applications
     * const count = await prisma.application.count({
     *   where: {
     *     // ... the filter for the Applications we want to count
     *   }
     * })
    **/
    count<T extends ApplicationCountArgs>(
      args?: Subset<T, ApplicationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ApplicationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Application.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ApplicationAggregateArgs>(args: Subset<T, ApplicationAggregateArgs>): Prisma.PrismaPromise<GetApplicationAggregateType<T>>

    /**
     * Group by Application.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ApplicationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ApplicationGroupByArgs['orderBy'] }
        : { orderBy?: ApplicationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ApplicationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetApplicationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Application model
   */
  readonly fields: ApplicationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Application.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ApplicationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    runtimes<T extends Application$runtimesArgs<ExtArgs> = {}>(args?: Subset<T, Application$runtimesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RuntimePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Application model
   */
  interface ApplicationFieldRefs {
    readonly id: FieldRef<"Application", 'String'>
    readonly name: FieldRef<"Application", 'String'>
    readonly baseUrl: FieldRef<"Application", 'String'>
    readonly environment: FieldRef<"Application", 'ApplicationEnvironment'>
    readonly status: FieldRef<"Application", 'ApplicationStatus'>
    readonly lastScannedAt: FieldRef<"Application", 'DateTime'>
    readonly createdAt: FieldRef<"Application", 'DateTime'>
    readonly updatedAt: FieldRef<"Application", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Application findUnique
   */
  export type ApplicationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Application
     */
    select?: ApplicationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Application
     */
    omit?: ApplicationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationInclude<ExtArgs> | null
    /**
     * Filter, which Application to fetch.
     */
    where: ApplicationWhereUniqueInput
  }

  /**
   * Application findUniqueOrThrow
   */
  export type ApplicationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Application
     */
    select?: ApplicationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Application
     */
    omit?: ApplicationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationInclude<ExtArgs> | null
    /**
     * Filter, which Application to fetch.
     */
    where: ApplicationWhereUniqueInput
  }

  /**
   * Application findFirst
   */
  export type ApplicationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Application
     */
    select?: ApplicationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Application
     */
    omit?: ApplicationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationInclude<ExtArgs> | null
    /**
     * Filter, which Application to fetch.
     */
    where?: ApplicationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Applications to fetch.
     */
    orderBy?: ApplicationOrderByWithRelationInput | ApplicationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Applications.
     */
    cursor?: ApplicationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Applications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Applications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Applications.
     */
    distinct?: ApplicationScalarFieldEnum | ApplicationScalarFieldEnum[]
  }

  /**
   * Application findFirstOrThrow
   */
  export type ApplicationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Application
     */
    select?: ApplicationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Application
     */
    omit?: ApplicationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationInclude<ExtArgs> | null
    /**
     * Filter, which Application to fetch.
     */
    where?: ApplicationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Applications to fetch.
     */
    orderBy?: ApplicationOrderByWithRelationInput | ApplicationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Applications.
     */
    cursor?: ApplicationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Applications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Applications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Applications.
     */
    distinct?: ApplicationScalarFieldEnum | ApplicationScalarFieldEnum[]
  }

  /**
   * Application findMany
   */
  export type ApplicationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Application
     */
    select?: ApplicationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Application
     */
    omit?: ApplicationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationInclude<ExtArgs> | null
    /**
     * Filter, which Applications to fetch.
     */
    where?: ApplicationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Applications to fetch.
     */
    orderBy?: ApplicationOrderByWithRelationInput | ApplicationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Applications.
     */
    cursor?: ApplicationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Applications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Applications.
     */
    skip?: number
    distinct?: ApplicationScalarFieldEnum | ApplicationScalarFieldEnum[]
  }

  /**
   * Application create
   */
  export type ApplicationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Application
     */
    select?: ApplicationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Application
     */
    omit?: ApplicationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationInclude<ExtArgs> | null
    /**
     * The data needed to create a Application.
     */
    data: XOR<ApplicationCreateInput, ApplicationUncheckedCreateInput>
  }

  /**
   * Application createMany
   */
  export type ApplicationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Applications.
     */
    data: ApplicationCreateManyInput | ApplicationCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Application createManyAndReturn
   */
  export type ApplicationCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Application
     */
    select?: ApplicationSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Application
     */
    omit?: ApplicationOmit<ExtArgs> | null
    /**
     * The data used to create many Applications.
     */
    data: ApplicationCreateManyInput | ApplicationCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Application update
   */
  export type ApplicationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Application
     */
    select?: ApplicationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Application
     */
    omit?: ApplicationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationInclude<ExtArgs> | null
    /**
     * The data needed to update a Application.
     */
    data: XOR<ApplicationUpdateInput, ApplicationUncheckedUpdateInput>
    /**
     * Choose, which Application to update.
     */
    where: ApplicationWhereUniqueInput
  }

  /**
   * Application updateMany
   */
  export type ApplicationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Applications.
     */
    data: XOR<ApplicationUpdateManyMutationInput, ApplicationUncheckedUpdateManyInput>
    /**
     * Filter which Applications to update
     */
    where?: ApplicationWhereInput
    /**
     * Limit how many Applications to update.
     */
    limit?: number
  }

  /**
   * Application updateManyAndReturn
   */
  export type ApplicationUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Application
     */
    select?: ApplicationSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Application
     */
    omit?: ApplicationOmit<ExtArgs> | null
    /**
     * The data used to update Applications.
     */
    data: XOR<ApplicationUpdateManyMutationInput, ApplicationUncheckedUpdateManyInput>
    /**
     * Filter which Applications to update
     */
    where?: ApplicationWhereInput
    /**
     * Limit how many Applications to update.
     */
    limit?: number
  }

  /**
   * Application upsert
   */
  export type ApplicationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Application
     */
    select?: ApplicationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Application
     */
    omit?: ApplicationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationInclude<ExtArgs> | null
    /**
     * The filter to search for the Application to update in case it exists.
     */
    where: ApplicationWhereUniqueInput
    /**
     * In case the Application found by the `where` argument doesn't exist, create a new Application with this data.
     */
    create: XOR<ApplicationCreateInput, ApplicationUncheckedCreateInput>
    /**
     * In case the Application was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ApplicationUpdateInput, ApplicationUncheckedUpdateInput>
  }

  /**
   * Application delete
   */
  export type ApplicationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Application
     */
    select?: ApplicationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Application
     */
    omit?: ApplicationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationInclude<ExtArgs> | null
    /**
     * Filter which Application to delete.
     */
    where: ApplicationWhereUniqueInput
  }

  /**
   * Application deleteMany
   */
  export type ApplicationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Applications to delete
     */
    where?: ApplicationWhereInput
    /**
     * Limit how many Applications to delete.
     */
    limit?: number
  }

  /**
   * Application.runtimes
   */
  export type Application$runtimesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Runtime
     */
    select?: RuntimeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Runtime
     */
    omit?: RuntimeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuntimeInclude<ExtArgs> | null
    where?: RuntimeWhereInput
    orderBy?: RuntimeOrderByWithRelationInput | RuntimeOrderByWithRelationInput[]
    cursor?: RuntimeWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RuntimeScalarFieldEnum | RuntimeScalarFieldEnum[]
  }

  /**
   * Application without action
   */
  export type ApplicationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Application
     */
    select?: ApplicationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Application
     */
    omit?: ApplicationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationInclude<ExtArgs> | null
  }


  /**
   * Model Runtime
   */

  export type AggregateRuntime = {
    _count: RuntimeCountAggregateOutputType | null
    _min: RuntimeMinAggregateOutputType | null
    _max: RuntimeMaxAggregateOutputType | null
  }

  export type RuntimeMinAggregateOutputType = {
    id: string | null
    name: string | null
    serviceType: $Enums.RuntimeServiceType | null
    provider: $Enums.RuntimeProvider | null
    environment: $Enums.ApplicationEnvironment | null
    region: string | null
    status: $Enums.RuntimeStatus | null
    applicationId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RuntimeMaxAggregateOutputType = {
    id: string | null
    name: string | null
    serviceType: $Enums.RuntimeServiceType | null
    provider: $Enums.RuntimeProvider | null
    environment: $Enums.ApplicationEnvironment | null
    region: string | null
    status: $Enums.RuntimeStatus | null
    applicationId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RuntimeCountAggregateOutputType = {
    id: number
    name: number
    serviceType: number
    provider: number
    environment: number
    region: number
    status: number
    applicationId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type RuntimeMinAggregateInputType = {
    id?: true
    name?: true
    serviceType?: true
    provider?: true
    environment?: true
    region?: true
    status?: true
    applicationId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RuntimeMaxAggregateInputType = {
    id?: true
    name?: true
    serviceType?: true
    provider?: true
    environment?: true
    region?: true
    status?: true
    applicationId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RuntimeCountAggregateInputType = {
    id?: true
    name?: true
    serviceType?: true
    provider?: true
    environment?: true
    region?: true
    status?: true
    applicationId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type RuntimeAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Runtime to aggregate.
     */
    where?: RuntimeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Runtimes to fetch.
     */
    orderBy?: RuntimeOrderByWithRelationInput | RuntimeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RuntimeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Runtimes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Runtimes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Runtimes
    **/
    _count?: true | RuntimeCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RuntimeMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RuntimeMaxAggregateInputType
  }

  export type GetRuntimeAggregateType<T extends RuntimeAggregateArgs> = {
        [P in keyof T & keyof AggregateRuntime]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRuntime[P]>
      : GetScalarType<T[P], AggregateRuntime[P]>
  }




  export type RuntimeGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RuntimeWhereInput
    orderBy?: RuntimeOrderByWithAggregationInput | RuntimeOrderByWithAggregationInput[]
    by: RuntimeScalarFieldEnum[] | RuntimeScalarFieldEnum
    having?: RuntimeScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RuntimeCountAggregateInputType | true
    _min?: RuntimeMinAggregateInputType
    _max?: RuntimeMaxAggregateInputType
  }

  export type RuntimeGroupByOutputType = {
    id: string
    name: string
    serviceType: $Enums.RuntimeServiceType
    provider: $Enums.RuntimeProvider
    environment: $Enums.ApplicationEnvironment
    region: string
    status: $Enums.RuntimeStatus
    applicationId: string | null
    createdAt: Date
    updatedAt: Date
    _count: RuntimeCountAggregateOutputType | null
    _min: RuntimeMinAggregateOutputType | null
    _max: RuntimeMaxAggregateOutputType | null
  }

  type GetRuntimeGroupByPayload<T extends RuntimeGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RuntimeGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RuntimeGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RuntimeGroupByOutputType[P]>
            : GetScalarType<T[P], RuntimeGroupByOutputType[P]>
        }
      >
    >


  export type RuntimeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    serviceType?: boolean
    provider?: boolean
    environment?: boolean
    region?: boolean
    status?: boolean
    applicationId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    application?: boolean | Runtime$applicationArgs<ExtArgs>
  }, ExtArgs["result"]["runtime"]>

  export type RuntimeSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    serviceType?: boolean
    provider?: boolean
    environment?: boolean
    region?: boolean
    status?: boolean
    applicationId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    application?: boolean | Runtime$applicationArgs<ExtArgs>
  }, ExtArgs["result"]["runtime"]>

  export type RuntimeSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    serviceType?: boolean
    provider?: boolean
    environment?: boolean
    region?: boolean
    status?: boolean
    applicationId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    application?: boolean | Runtime$applicationArgs<ExtArgs>
  }, ExtArgs["result"]["runtime"]>

  export type RuntimeSelectScalar = {
    id?: boolean
    name?: boolean
    serviceType?: boolean
    provider?: boolean
    environment?: boolean
    region?: boolean
    status?: boolean
    applicationId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type RuntimeOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "serviceType" | "provider" | "environment" | "region" | "status" | "applicationId" | "createdAt" | "updatedAt", ExtArgs["result"]["runtime"]>
  export type RuntimeInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    application?: boolean | Runtime$applicationArgs<ExtArgs>
  }
  export type RuntimeIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    application?: boolean | Runtime$applicationArgs<ExtArgs>
  }
  export type RuntimeIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    application?: boolean | Runtime$applicationArgs<ExtArgs>
  }

  export type $RuntimePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Runtime"
    objects: {
      application: Prisma.$ApplicationPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      serviceType: $Enums.RuntimeServiceType
      provider: $Enums.RuntimeProvider
      environment: $Enums.ApplicationEnvironment
      region: string
      status: $Enums.RuntimeStatus
      applicationId: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["runtime"]>
    composites: {}
  }

  type RuntimeGetPayload<S extends boolean | null | undefined | RuntimeDefaultArgs> = $Result.GetResult<Prisma.$RuntimePayload, S>

  type RuntimeCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RuntimeFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RuntimeCountAggregateInputType | true
    }

  export interface RuntimeDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Runtime'], meta: { name: 'Runtime' } }
    /**
     * Find zero or one Runtime that matches the filter.
     * @param {RuntimeFindUniqueArgs} args - Arguments to find a Runtime
     * @example
     * // Get one Runtime
     * const runtime = await prisma.runtime.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RuntimeFindUniqueArgs>(args: SelectSubset<T, RuntimeFindUniqueArgs<ExtArgs>>): Prisma__RuntimeClient<$Result.GetResult<Prisma.$RuntimePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Runtime that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RuntimeFindUniqueOrThrowArgs} args - Arguments to find a Runtime
     * @example
     * // Get one Runtime
     * const runtime = await prisma.runtime.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RuntimeFindUniqueOrThrowArgs>(args: SelectSubset<T, RuntimeFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RuntimeClient<$Result.GetResult<Prisma.$RuntimePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Runtime that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuntimeFindFirstArgs} args - Arguments to find a Runtime
     * @example
     * // Get one Runtime
     * const runtime = await prisma.runtime.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RuntimeFindFirstArgs>(args?: SelectSubset<T, RuntimeFindFirstArgs<ExtArgs>>): Prisma__RuntimeClient<$Result.GetResult<Prisma.$RuntimePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Runtime that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuntimeFindFirstOrThrowArgs} args - Arguments to find a Runtime
     * @example
     * // Get one Runtime
     * const runtime = await prisma.runtime.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RuntimeFindFirstOrThrowArgs>(args?: SelectSubset<T, RuntimeFindFirstOrThrowArgs<ExtArgs>>): Prisma__RuntimeClient<$Result.GetResult<Prisma.$RuntimePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Runtimes that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuntimeFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Runtimes
     * const runtimes = await prisma.runtime.findMany()
     * 
     * // Get first 10 Runtimes
     * const runtimes = await prisma.runtime.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const runtimeWithIdOnly = await prisma.runtime.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RuntimeFindManyArgs>(args?: SelectSubset<T, RuntimeFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RuntimePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Runtime.
     * @param {RuntimeCreateArgs} args - Arguments to create a Runtime.
     * @example
     * // Create one Runtime
     * const Runtime = await prisma.runtime.create({
     *   data: {
     *     // ... data to create a Runtime
     *   }
     * })
     * 
     */
    create<T extends RuntimeCreateArgs>(args: SelectSubset<T, RuntimeCreateArgs<ExtArgs>>): Prisma__RuntimeClient<$Result.GetResult<Prisma.$RuntimePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Runtimes.
     * @param {RuntimeCreateManyArgs} args - Arguments to create many Runtimes.
     * @example
     * // Create many Runtimes
     * const runtime = await prisma.runtime.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RuntimeCreateManyArgs>(args?: SelectSubset<T, RuntimeCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Runtimes and returns the data saved in the database.
     * @param {RuntimeCreateManyAndReturnArgs} args - Arguments to create many Runtimes.
     * @example
     * // Create many Runtimes
     * const runtime = await prisma.runtime.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Runtimes and only return the `id`
     * const runtimeWithIdOnly = await prisma.runtime.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RuntimeCreateManyAndReturnArgs>(args?: SelectSubset<T, RuntimeCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RuntimePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Runtime.
     * @param {RuntimeDeleteArgs} args - Arguments to delete one Runtime.
     * @example
     * // Delete one Runtime
     * const Runtime = await prisma.runtime.delete({
     *   where: {
     *     // ... filter to delete one Runtime
     *   }
     * })
     * 
     */
    delete<T extends RuntimeDeleteArgs>(args: SelectSubset<T, RuntimeDeleteArgs<ExtArgs>>): Prisma__RuntimeClient<$Result.GetResult<Prisma.$RuntimePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Runtime.
     * @param {RuntimeUpdateArgs} args - Arguments to update one Runtime.
     * @example
     * // Update one Runtime
     * const runtime = await prisma.runtime.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RuntimeUpdateArgs>(args: SelectSubset<T, RuntimeUpdateArgs<ExtArgs>>): Prisma__RuntimeClient<$Result.GetResult<Prisma.$RuntimePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Runtimes.
     * @param {RuntimeDeleteManyArgs} args - Arguments to filter Runtimes to delete.
     * @example
     * // Delete a few Runtimes
     * const { count } = await prisma.runtime.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RuntimeDeleteManyArgs>(args?: SelectSubset<T, RuntimeDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Runtimes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuntimeUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Runtimes
     * const runtime = await prisma.runtime.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RuntimeUpdateManyArgs>(args: SelectSubset<T, RuntimeUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Runtimes and returns the data updated in the database.
     * @param {RuntimeUpdateManyAndReturnArgs} args - Arguments to update many Runtimes.
     * @example
     * // Update many Runtimes
     * const runtime = await prisma.runtime.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Runtimes and only return the `id`
     * const runtimeWithIdOnly = await prisma.runtime.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RuntimeUpdateManyAndReturnArgs>(args: SelectSubset<T, RuntimeUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RuntimePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Runtime.
     * @param {RuntimeUpsertArgs} args - Arguments to update or create a Runtime.
     * @example
     * // Update or create a Runtime
     * const runtime = await prisma.runtime.upsert({
     *   create: {
     *     // ... data to create a Runtime
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Runtime we want to update
     *   }
     * })
     */
    upsert<T extends RuntimeUpsertArgs>(args: SelectSubset<T, RuntimeUpsertArgs<ExtArgs>>): Prisma__RuntimeClient<$Result.GetResult<Prisma.$RuntimePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Runtimes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuntimeCountArgs} args - Arguments to filter Runtimes to count.
     * @example
     * // Count the number of Runtimes
     * const count = await prisma.runtime.count({
     *   where: {
     *     // ... the filter for the Runtimes we want to count
     *   }
     * })
    **/
    count<T extends RuntimeCountArgs>(
      args?: Subset<T, RuntimeCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RuntimeCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Runtime.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuntimeAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RuntimeAggregateArgs>(args: Subset<T, RuntimeAggregateArgs>): Prisma.PrismaPromise<GetRuntimeAggregateType<T>>

    /**
     * Group by Runtime.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuntimeGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RuntimeGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RuntimeGroupByArgs['orderBy'] }
        : { orderBy?: RuntimeGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RuntimeGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRuntimeGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Runtime model
   */
  readonly fields: RuntimeFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Runtime.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RuntimeClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    application<T extends Runtime$applicationArgs<ExtArgs> = {}>(args?: Subset<T, Runtime$applicationArgs<ExtArgs>>): Prisma__ApplicationClient<$Result.GetResult<Prisma.$ApplicationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Runtime model
   */
  interface RuntimeFieldRefs {
    readonly id: FieldRef<"Runtime", 'String'>
    readonly name: FieldRef<"Runtime", 'String'>
    readonly serviceType: FieldRef<"Runtime", 'RuntimeServiceType'>
    readonly provider: FieldRef<"Runtime", 'RuntimeProvider'>
    readonly environment: FieldRef<"Runtime", 'ApplicationEnvironment'>
    readonly region: FieldRef<"Runtime", 'String'>
    readonly status: FieldRef<"Runtime", 'RuntimeStatus'>
    readonly applicationId: FieldRef<"Runtime", 'String'>
    readonly createdAt: FieldRef<"Runtime", 'DateTime'>
    readonly updatedAt: FieldRef<"Runtime", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Runtime findUnique
   */
  export type RuntimeFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Runtime
     */
    select?: RuntimeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Runtime
     */
    omit?: RuntimeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuntimeInclude<ExtArgs> | null
    /**
     * Filter, which Runtime to fetch.
     */
    where: RuntimeWhereUniqueInput
  }

  /**
   * Runtime findUniqueOrThrow
   */
  export type RuntimeFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Runtime
     */
    select?: RuntimeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Runtime
     */
    omit?: RuntimeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuntimeInclude<ExtArgs> | null
    /**
     * Filter, which Runtime to fetch.
     */
    where: RuntimeWhereUniqueInput
  }

  /**
   * Runtime findFirst
   */
  export type RuntimeFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Runtime
     */
    select?: RuntimeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Runtime
     */
    omit?: RuntimeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuntimeInclude<ExtArgs> | null
    /**
     * Filter, which Runtime to fetch.
     */
    where?: RuntimeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Runtimes to fetch.
     */
    orderBy?: RuntimeOrderByWithRelationInput | RuntimeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Runtimes.
     */
    cursor?: RuntimeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Runtimes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Runtimes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Runtimes.
     */
    distinct?: RuntimeScalarFieldEnum | RuntimeScalarFieldEnum[]
  }

  /**
   * Runtime findFirstOrThrow
   */
  export type RuntimeFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Runtime
     */
    select?: RuntimeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Runtime
     */
    omit?: RuntimeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuntimeInclude<ExtArgs> | null
    /**
     * Filter, which Runtime to fetch.
     */
    where?: RuntimeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Runtimes to fetch.
     */
    orderBy?: RuntimeOrderByWithRelationInput | RuntimeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Runtimes.
     */
    cursor?: RuntimeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Runtimes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Runtimes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Runtimes.
     */
    distinct?: RuntimeScalarFieldEnum | RuntimeScalarFieldEnum[]
  }

  /**
   * Runtime findMany
   */
  export type RuntimeFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Runtime
     */
    select?: RuntimeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Runtime
     */
    omit?: RuntimeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuntimeInclude<ExtArgs> | null
    /**
     * Filter, which Runtimes to fetch.
     */
    where?: RuntimeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Runtimes to fetch.
     */
    orderBy?: RuntimeOrderByWithRelationInput | RuntimeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Runtimes.
     */
    cursor?: RuntimeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Runtimes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Runtimes.
     */
    skip?: number
    distinct?: RuntimeScalarFieldEnum | RuntimeScalarFieldEnum[]
  }

  /**
   * Runtime create
   */
  export type RuntimeCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Runtime
     */
    select?: RuntimeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Runtime
     */
    omit?: RuntimeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuntimeInclude<ExtArgs> | null
    /**
     * The data needed to create a Runtime.
     */
    data: XOR<RuntimeCreateInput, RuntimeUncheckedCreateInput>
  }

  /**
   * Runtime createMany
   */
  export type RuntimeCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Runtimes.
     */
    data: RuntimeCreateManyInput | RuntimeCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Runtime createManyAndReturn
   */
  export type RuntimeCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Runtime
     */
    select?: RuntimeSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Runtime
     */
    omit?: RuntimeOmit<ExtArgs> | null
    /**
     * The data used to create many Runtimes.
     */
    data: RuntimeCreateManyInput | RuntimeCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuntimeIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Runtime update
   */
  export type RuntimeUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Runtime
     */
    select?: RuntimeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Runtime
     */
    omit?: RuntimeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuntimeInclude<ExtArgs> | null
    /**
     * The data needed to update a Runtime.
     */
    data: XOR<RuntimeUpdateInput, RuntimeUncheckedUpdateInput>
    /**
     * Choose, which Runtime to update.
     */
    where: RuntimeWhereUniqueInput
  }

  /**
   * Runtime updateMany
   */
  export type RuntimeUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Runtimes.
     */
    data: XOR<RuntimeUpdateManyMutationInput, RuntimeUncheckedUpdateManyInput>
    /**
     * Filter which Runtimes to update
     */
    where?: RuntimeWhereInput
    /**
     * Limit how many Runtimes to update.
     */
    limit?: number
  }

  /**
   * Runtime updateManyAndReturn
   */
  export type RuntimeUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Runtime
     */
    select?: RuntimeSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Runtime
     */
    omit?: RuntimeOmit<ExtArgs> | null
    /**
     * The data used to update Runtimes.
     */
    data: XOR<RuntimeUpdateManyMutationInput, RuntimeUncheckedUpdateManyInput>
    /**
     * Filter which Runtimes to update
     */
    where?: RuntimeWhereInput
    /**
     * Limit how many Runtimes to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuntimeIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Runtime upsert
   */
  export type RuntimeUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Runtime
     */
    select?: RuntimeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Runtime
     */
    omit?: RuntimeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuntimeInclude<ExtArgs> | null
    /**
     * The filter to search for the Runtime to update in case it exists.
     */
    where: RuntimeWhereUniqueInput
    /**
     * In case the Runtime found by the `where` argument doesn't exist, create a new Runtime with this data.
     */
    create: XOR<RuntimeCreateInput, RuntimeUncheckedCreateInput>
    /**
     * In case the Runtime was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RuntimeUpdateInput, RuntimeUncheckedUpdateInput>
  }

  /**
   * Runtime delete
   */
  export type RuntimeDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Runtime
     */
    select?: RuntimeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Runtime
     */
    omit?: RuntimeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuntimeInclude<ExtArgs> | null
    /**
     * Filter which Runtime to delete.
     */
    where: RuntimeWhereUniqueInput
  }

  /**
   * Runtime deleteMany
   */
  export type RuntimeDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Runtimes to delete
     */
    where?: RuntimeWhereInput
    /**
     * Limit how many Runtimes to delete.
     */
    limit?: number
  }

  /**
   * Runtime.application
   */
  export type Runtime$applicationArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Application
     */
    select?: ApplicationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Application
     */
    omit?: ApplicationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationInclude<ExtArgs> | null
    where?: ApplicationWhereInput
  }

  /**
   * Runtime without action
   */
  export type RuntimeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Runtime
     */
    select?: RuntimeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Runtime
     */
    omit?: RuntimeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RuntimeInclude<ExtArgs> | null
  }


  /**
   * Model AiProvider
   */

  export type AggregateAiProvider = {
    _count: AiProviderCountAggregateOutputType | null
    _min: AiProviderMinAggregateOutputType | null
    _max: AiProviderMaxAggregateOutputType | null
  }

  export type AiProviderMinAggregateOutputType = {
    id: string | null
    name: string | null
    kind: $Enums.AiProviderKind | null
    status: $Enums.AiProviderStatus | null
    description: string | null
    baseUrl: string | null
    model: string | null
    apiKey: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AiProviderMaxAggregateOutputType = {
    id: string | null
    name: string | null
    kind: $Enums.AiProviderKind | null
    status: $Enums.AiProviderStatus | null
    description: string | null
    baseUrl: string | null
    model: string | null
    apiKey: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AiProviderCountAggregateOutputType = {
    id: number
    name: number
    kind: number
    status: number
    description: number
    baseUrl: number
    model: number
    apiKey: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type AiProviderMinAggregateInputType = {
    id?: true
    name?: true
    kind?: true
    status?: true
    description?: true
    baseUrl?: true
    model?: true
    apiKey?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AiProviderMaxAggregateInputType = {
    id?: true
    name?: true
    kind?: true
    status?: true
    description?: true
    baseUrl?: true
    model?: true
    apiKey?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AiProviderCountAggregateInputType = {
    id?: true
    name?: true
    kind?: true
    status?: true
    description?: true
    baseUrl?: true
    model?: true
    apiKey?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type AiProviderAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AiProvider to aggregate.
     */
    where?: AiProviderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiProviders to fetch.
     */
    orderBy?: AiProviderOrderByWithRelationInput | AiProviderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AiProviderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiProviders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiProviders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AiProviders
    **/
    _count?: true | AiProviderCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AiProviderMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AiProviderMaxAggregateInputType
  }

  export type GetAiProviderAggregateType<T extends AiProviderAggregateArgs> = {
        [P in keyof T & keyof AggregateAiProvider]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAiProvider[P]>
      : GetScalarType<T[P], AggregateAiProvider[P]>
  }




  export type AiProviderGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AiProviderWhereInput
    orderBy?: AiProviderOrderByWithAggregationInput | AiProviderOrderByWithAggregationInput[]
    by: AiProviderScalarFieldEnum[] | AiProviderScalarFieldEnum
    having?: AiProviderScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AiProviderCountAggregateInputType | true
    _min?: AiProviderMinAggregateInputType
    _max?: AiProviderMaxAggregateInputType
  }

  export type AiProviderGroupByOutputType = {
    id: string
    name: string
    kind: $Enums.AiProviderKind
    status: $Enums.AiProviderStatus
    description: string | null
    baseUrl: string | null
    model: string
    apiKey: string | null
    createdAt: Date
    updatedAt: Date
    _count: AiProviderCountAggregateOutputType | null
    _min: AiProviderMinAggregateOutputType | null
    _max: AiProviderMaxAggregateOutputType | null
  }

  type GetAiProviderGroupByPayload<T extends AiProviderGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AiProviderGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AiProviderGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AiProviderGroupByOutputType[P]>
            : GetScalarType<T[P], AiProviderGroupByOutputType[P]>
        }
      >
    >


  export type AiProviderSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    kind?: boolean
    status?: boolean
    description?: boolean
    baseUrl?: boolean
    model?: boolean
    apiKey?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    agents?: boolean | AiProvider$agentsArgs<ExtArgs>
    _count?: boolean | AiProviderCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aiProvider"]>

  export type AiProviderSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    kind?: boolean
    status?: boolean
    description?: boolean
    baseUrl?: boolean
    model?: boolean
    apiKey?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["aiProvider"]>

  export type AiProviderSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    kind?: boolean
    status?: boolean
    description?: boolean
    baseUrl?: boolean
    model?: boolean
    apiKey?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["aiProvider"]>

  export type AiProviderSelectScalar = {
    id?: boolean
    name?: boolean
    kind?: boolean
    status?: boolean
    description?: boolean
    baseUrl?: boolean
    model?: boolean
    apiKey?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type AiProviderOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "kind" | "status" | "description" | "baseUrl" | "model" | "apiKey" | "createdAt" | "updatedAt", ExtArgs["result"]["aiProvider"]>
  export type AiProviderInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    agents?: boolean | AiProvider$agentsArgs<ExtArgs>
    _count?: boolean | AiProviderCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type AiProviderIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type AiProviderIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $AiProviderPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AiProvider"
    objects: {
      agents: Prisma.$AiAgentPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      kind: $Enums.AiProviderKind
      status: $Enums.AiProviderStatus
      description: string | null
      baseUrl: string | null
      model: string
      apiKey: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["aiProvider"]>
    composites: {}
  }

  type AiProviderGetPayload<S extends boolean | null | undefined | AiProviderDefaultArgs> = $Result.GetResult<Prisma.$AiProviderPayload, S>

  type AiProviderCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AiProviderFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AiProviderCountAggregateInputType | true
    }

  export interface AiProviderDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AiProvider'], meta: { name: 'AiProvider' } }
    /**
     * Find zero or one AiProvider that matches the filter.
     * @param {AiProviderFindUniqueArgs} args - Arguments to find a AiProvider
     * @example
     * // Get one AiProvider
     * const aiProvider = await prisma.aiProvider.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AiProviderFindUniqueArgs>(args: SelectSubset<T, AiProviderFindUniqueArgs<ExtArgs>>): Prisma__AiProviderClient<$Result.GetResult<Prisma.$AiProviderPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AiProvider that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AiProviderFindUniqueOrThrowArgs} args - Arguments to find a AiProvider
     * @example
     * // Get one AiProvider
     * const aiProvider = await prisma.aiProvider.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AiProviderFindUniqueOrThrowArgs>(args: SelectSubset<T, AiProviderFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AiProviderClient<$Result.GetResult<Prisma.$AiProviderPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AiProvider that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiProviderFindFirstArgs} args - Arguments to find a AiProvider
     * @example
     * // Get one AiProvider
     * const aiProvider = await prisma.aiProvider.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AiProviderFindFirstArgs>(args?: SelectSubset<T, AiProviderFindFirstArgs<ExtArgs>>): Prisma__AiProviderClient<$Result.GetResult<Prisma.$AiProviderPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AiProvider that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiProviderFindFirstOrThrowArgs} args - Arguments to find a AiProvider
     * @example
     * // Get one AiProvider
     * const aiProvider = await prisma.aiProvider.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AiProviderFindFirstOrThrowArgs>(args?: SelectSubset<T, AiProviderFindFirstOrThrowArgs<ExtArgs>>): Prisma__AiProviderClient<$Result.GetResult<Prisma.$AiProviderPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AiProviders that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiProviderFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AiProviders
     * const aiProviders = await prisma.aiProvider.findMany()
     * 
     * // Get first 10 AiProviders
     * const aiProviders = await prisma.aiProvider.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const aiProviderWithIdOnly = await prisma.aiProvider.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AiProviderFindManyArgs>(args?: SelectSubset<T, AiProviderFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiProviderPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AiProvider.
     * @param {AiProviderCreateArgs} args - Arguments to create a AiProvider.
     * @example
     * // Create one AiProvider
     * const AiProvider = await prisma.aiProvider.create({
     *   data: {
     *     // ... data to create a AiProvider
     *   }
     * })
     * 
     */
    create<T extends AiProviderCreateArgs>(args: SelectSubset<T, AiProviderCreateArgs<ExtArgs>>): Prisma__AiProviderClient<$Result.GetResult<Prisma.$AiProviderPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AiProviders.
     * @param {AiProviderCreateManyArgs} args - Arguments to create many AiProviders.
     * @example
     * // Create many AiProviders
     * const aiProvider = await prisma.aiProvider.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AiProviderCreateManyArgs>(args?: SelectSubset<T, AiProviderCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AiProviders and returns the data saved in the database.
     * @param {AiProviderCreateManyAndReturnArgs} args - Arguments to create many AiProviders.
     * @example
     * // Create many AiProviders
     * const aiProvider = await prisma.aiProvider.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AiProviders and only return the `id`
     * const aiProviderWithIdOnly = await prisma.aiProvider.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AiProviderCreateManyAndReturnArgs>(args?: SelectSubset<T, AiProviderCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiProviderPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AiProvider.
     * @param {AiProviderDeleteArgs} args - Arguments to delete one AiProvider.
     * @example
     * // Delete one AiProvider
     * const AiProvider = await prisma.aiProvider.delete({
     *   where: {
     *     // ... filter to delete one AiProvider
     *   }
     * })
     * 
     */
    delete<T extends AiProviderDeleteArgs>(args: SelectSubset<T, AiProviderDeleteArgs<ExtArgs>>): Prisma__AiProviderClient<$Result.GetResult<Prisma.$AiProviderPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AiProvider.
     * @param {AiProviderUpdateArgs} args - Arguments to update one AiProvider.
     * @example
     * // Update one AiProvider
     * const aiProvider = await prisma.aiProvider.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AiProviderUpdateArgs>(args: SelectSubset<T, AiProviderUpdateArgs<ExtArgs>>): Prisma__AiProviderClient<$Result.GetResult<Prisma.$AiProviderPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AiProviders.
     * @param {AiProviderDeleteManyArgs} args - Arguments to filter AiProviders to delete.
     * @example
     * // Delete a few AiProviders
     * const { count } = await prisma.aiProvider.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AiProviderDeleteManyArgs>(args?: SelectSubset<T, AiProviderDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AiProviders.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiProviderUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AiProviders
     * const aiProvider = await prisma.aiProvider.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AiProviderUpdateManyArgs>(args: SelectSubset<T, AiProviderUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AiProviders and returns the data updated in the database.
     * @param {AiProviderUpdateManyAndReturnArgs} args - Arguments to update many AiProviders.
     * @example
     * // Update many AiProviders
     * const aiProvider = await prisma.aiProvider.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AiProviders and only return the `id`
     * const aiProviderWithIdOnly = await prisma.aiProvider.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AiProviderUpdateManyAndReturnArgs>(args: SelectSubset<T, AiProviderUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiProviderPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AiProvider.
     * @param {AiProviderUpsertArgs} args - Arguments to update or create a AiProvider.
     * @example
     * // Update or create a AiProvider
     * const aiProvider = await prisma.aiProvider.upsert({
     *   create: {
     *     // ... data to create a AiProvider
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AiProvider we want to update
     *   }
     * })
     */
    upsert<T extends AiProviderUpsertArgs>(args: SelectSubset<T, AiProviderUpsertArgs<ExtArgs>>): Prisma__AiProviderClient<$Result.GetResult<Prisma.$AiProviderPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AiProviders.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiProviderCountArgs} args - Arguments to filter AiProviders to count.
     * @example
     * // Count the number of AiProviders
     * const count = await prisma.aiProvider.count({
     *   where: {
     *     // ... the filter for the AiProviders we want to count
     *   }
     * })
    **/
    count<T extends AiProviderCountArgs>(
      args?: Subset<T, AiProviderCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AiProviderCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AiProvider.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiProviderAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AiProviderAggregateArgs>(args: Subset<T, AiProviderAggregateArgs>): Prisma.PrismaPromise<GetAiProviderAggregateType<T>>

    /**
     * Group by AiProvider.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiProviderGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AiProviderGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AiProviderGroupByArgs['orderBy'] }
        : { orderBy?: AiProviderGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AiProviderGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAiProviderGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AiProvider model
   */
  readonly fields: AiProviderFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AiProvider.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AiProviderClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    agents<T extends AiProvider$agentsArgs<ExtArgs> = {}>(args?: Subset<T, AiProvider$agentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiAgentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AiProvider model
   */
  interface AiProviderFieldRefs {
    readonly id: FieldRef<"AiProvider", 'String'>
    readonly name: FieldRef<"AiProvider", 'String'>
    readonly kind: FieldRef<"AiProvider", 'AiProviderKind'>
    readonly status: FieldRef<"AiProvider", 'AiProviderStatus'>
    readonly description: FieldRef<"AiProvider", 'String'>
    readonly baseUrl: FieldRef<"AiProvider", 'String'>
    readonly model: FieldRef<"AiProvider", 'String'>
    readonly apiKey: FieldRef<"AiProvider", 'String'>
    readonly createdAt: FieldRef<"AiProvider", 'DateTime'>
    readonly updatedAt: FieldRef<"AiProvider", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AiProvider findUnique
   */
  export type AiProviderFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiProvider
     */
    select?: AiProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiProvider
     */
    omit?: AiProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiProviderInclude<ExtArgs> | null
    /**
     * Filter, which AiProvider to fetch.
     */
    where: AiProviderWhereUniqueInput
  }

  /**
   * AiProvider findUniqueOrThrow
   */
  export type AiProviderFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiProvider
     */
    select?: AiProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiProvider
     */
    omit?: AiProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiProviderInclude<ExtArgs> | null
    /**
     * Filter, which AiProvider to fetch.
     */
    where: AiProviderWhereUniqueInput
  }

  /**
   * AiProvider findFirst
   */
  export type AiProviderFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiProvider
     */
    select?: AiProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiProvider
     */
    omit?: AiProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiProviderInclude<ExtArgs> | null
    /**
     * Filter, which AiProvider to fetch.
     */
    where?: AiProviderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiProviders to fetch.
     */
    orderBy?: AiProviderOrderByWithRelationInput | AiProviderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AiProviders.
     */
    cursor?: AiProviderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiProviders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiProviders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AiProviders.
     */
    distinct?: AiProviderScalarFieldEnum | AiProviderScalarFieldEnum[]
  }

  /**
   * AiProvider findFirstOrThrow
   */
  export type AiProviderFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiProvider
     */
    select?: AiProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiProvider
     */
    omit?: AiProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiProviderInclude<ExtArgs> | null
    /**
     * Filter, which AiProvider to fetch.
     */
    where?: AiProviderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiProviders to fetch.
     */
    orderBy?: AiProviderOrderByWithRelationInput | AiProviderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AiProviders.
     */
    cursor?: AiProviderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiProviders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiProviders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AiProviders.
     */
    distinct?: AiProviderScalarFieldEnum | AiProviderScalarFieldEnum[]
  }

  /**
   * AiProvider findMany
   */
  export type AiProviderFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiProvider
     */
    select?: AiProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiProvider
     */
    omit?: AiProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiProviderInclude<ExtArgs> | null
    /**
     * Filter, which AiProviders to fetch.
     */
    where?: AiProviderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiProviders to fetch.
     */
    orderBy?: AiProviderOrderByWithRelationInput | AiProviderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AiProviders.
     */
    cursor?: AiProviderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiProviders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiProviders.
     */
    skip?: number
    distinct?: AiProviderScalarFieldEnum | AiProviderScalarFieldEnum[]
  }

  /**
   * AiProvider create
   */
  export type AiProviderCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiProvider
     */
    select?: AiProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiProvider
     */
    omit?: AiProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiProviderInclude<ExtArgs> | null
    /**
     * The data needed to create a AiProvider.
     */
    data: XOR<AiProviderCreateInput, AiProviderUncheckedCreateInput>
  }

  /**
   * AiProvider createMany
   */
  export type AiProviderCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AiProviders.
     */
    data: AiProviderCreateManyInput | AiProviderCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AiProvider createManyAndReturn
   */
  export type AiProviderCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiProvider
     */
    select?: AiProviderSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AiProvider
     */
    omit?: AiProviderOmit<ExtArgs> | null
    /**
     * The data used to create many AiProviders.
     */
    data: AiProviderCreateManyInput | AiProviderCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AiProvider update
   */
  export type AiProviderUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiProvider
     */
    select?: AiProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiProvider
     */
    omit?: AiProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiProviderInclude<ExtArgs> | null
    /**
     * The data needed to update a AiProvider.
     */
    data: XOR<AiProviderUpdateInput, AiProviderUncheckedUpdateInput>
    /**
     * Choose, which AiProvider to update.
     */
    where: AiProviderWhereUniqueInput
  }

  /**
   * AiProvider updateMany
   */
  export type AiProviderUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AiProviders.
     */
    data: XOR<AiProviderUpdateManyMutationInput, AiProviderUncheckedUpdateManyInput>
    /**
     * Filter which AiProviders to update
     */
    where?: AiProviderWhereInput
    /**
     * Limit how many AiProviders to update.
     */
    limit?: number
  }

  /**
   * AiProvider updateManyAndReturn
   */
  export type AiProviderUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiProvider
     */
    select?: AiProviderSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AiProvider
     */
    omit?: AiProviderOmit<ExtArgs> | null
    /**
     * The data used to update AiProviders.
     */
    data: XOR<AiProviderUpdateManyMutationInput, AiProviderUncheckedUpdateManyInput>
    /**
     * Filter which AiProviders to update
     */
    where?: AiProviderWhereInput
    /**
     * Limit how many AiProviders to update.
     */
    limit?: number
  }

  /**
   * AiProvider upsert
   */
  export type AiProviderUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiProvider
     */
    select?: AiProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiProvider
     */
    omit?: AiProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiProviderInclude<ExtArgs> | null
    /**
     * The filter to search for the AiProvider to update in case it exists.
     */
    where: AiProviderWhereUniqueInput
    /**
     * In case the AiProvider found by the `where` argument doesn't exist, create a new AiProvider with this data.
     */
    create: XOR<AiProviderCreateInput, AiProviderUncheckedCreateInput>
    /**
     * In case the AiProvider was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AiProviderUpdateInput, AiProviderUncheckedUpdateInput>
  }

  /**
   * AiProvider delete
   */
  export type AiProviderDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiProvider
     */
    select?: AiProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiProvider
     */
    omit?: AiProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiProviderInclude<ExtArgs> | null
    /**
     * Filter which AiProvider to delete.
     */
    where: AiProviderWhereUniqueInput
  }

  /**
   * AiProvider deleteMany
   */
  export type AiProviderDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AiProviders to delete
     */
    where?: AiProviderWhereInput
    /**
     * Limit how many AiProviders to delete.
     */
    limit?: number
  }

  /**
   * AiProvider.agents
   */
  export type AiProvider$agentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgent
     */
    select?: AiAgentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgent
     */
    omit?: AiAgentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentInclude<ExtArgs> | null
    where?: AiAgentWhereInput
    orderBy?: AiAgentOrderByWithRelationInput | AiAgentOrderByWithRelationInput[]
    cursor?: AiAgentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AiAgentScalarFieldEnum | AiAgentScalarFieldEnum[]
  }

  /**
   * AiProvider without action
   */
  export type AiProviderDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiProvider
     */
    select?: AiProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiProvider
     */
    omit?: AiProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiProviderInclude<ExtArgs> | null
  }


  /**
   * Model AiAgent
   */

  export type AggregateAiAgent = {
    _count: AiAgentCountAggregateOutputType | null
    _min: AiAgentMinAggregateOutputType | null
    _max: AiAgentMaxAggregateOutputType | null
  }

  export type AiAgentMinAggregateOutputType = {
    id: string | null
    name: string | null
    status: $Enums.AiAgentStatus | null
    description: string | null
    providerId: string | null
    systemPrompt: string | null
    modelOverride: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AiAgentMaxAggregateOutputType = {
    id: string | null
    name: string | null
    status: $Enums.AiAgentStatus | null
    description: string | null
    providerId: string | null
    systemPrompt: string | null
    modelOverride: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AiAgentCountAggregateOutputType = {
    id: number
    name: number
    status: number
    description: number
    providerId: number
    systemPrompt: number
    modelOverride: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type AiAgentMinAggregateInputType = {
    id?: true
    name?: true
    status?: true
    description?: true
    providerId?: true
    systemPrompt?: true
    modelOverride?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AiAgentMaxAggregateInputType = {
    id?: true
    name?: true
    status?: true
    description?: true
    providerId?: true
    systemPrompt?: true
    modelOverride?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AiAgentCountAggregateInputType = {
    id?: true
    name?: true
    status?: true
    description?: true
    providerId?: true
    systemPrompt?: true
    modelOverride?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type AiAgentAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AiAgent to aggregate.
     */
    where?: AiAgentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiAgents to fetch.
     */
    orderBy?: AiAgentOrderByWithRelationInput | AiAgentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AiAgentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiAgents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiAgents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AiAgents
    **/
    _count?: true | AiAgentCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AiAgentMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AiAgentMaxAggregateInputType
  }

  export type GetAiAgentAggregateType<T extends AiAgentAggregateArgs> = {
        [P in keyof T & keyof AggregateAiAgent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAiAgent[P]>
      : GetScalarType<T[P], AggregateAiAgent[P]>
  }




  export type AiAgentGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AiAgentWhereInput
    orderBy?: AiAgentOrderByWithAggregationInput | AiAgentOrderByWithAggregationInput[]
    by: AiAgentScalarFieldEnum[] | AiAgentScalarFieldEnum
    having?: AiAgentScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AiAgentCountAggregateInputType | true
    _min?: AiAgentMinAggregateInputType
    _max?: AiAgentMaxAggregateInputType
  }

  export type AiAgentGroupByOutputType = {
    id: string
    name: string
    status: $Enums.AiAgentStatus
    description: string | null
    providerId: string
    systemPrompt: string
    modelOverride: string | null
    createdAt: Date
    updatedAt: Date
    _count: AiAgentCountAggregateOutputType | null
    _min: AiAgentMinAggregateOutputType | null
    _max: AiAgentMaxAggregateOutputType | null
  }

  type GetAiAgentGroupByPayload<T extends AiAgentGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AiAgentGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AiAgentGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AiAgentGroupByOutputType[P]>
            : GetScalarType<T[P], AiAgentGroupByOutputType[P]>
        }
      >
    >


  export type AiAgentSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    status?: boolean
    description?: boolean
    providerId?: boolean
    systemPrompt?: boolean
    modelOverride?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    provider?: boolean | AiProviderDefaultArgs<ExtArgs>
    tools?: boolean | AiAgent$toolsArgs<ExtArgs>
    _count?: boolean | AiAgentCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aiAgent"]>

  export type AiAgentSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    status?: boolean
    description?: boolean
    providerId?: boolean
    systemPrompt?: boolean
    modelOverride?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    provider?: boolean | AiProviderDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aiAgent"]>

  export type AiAgentSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    status?: boolean
    description?: boolean
    providerId?: boolean
    systemPrompt?: boolean
    modelOverride?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    provider?: boolean | AiProviderDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aiAgent"]>

  export type AiAgentSelectScalar = {
    id?: boolean
    name?: boolean
    status?: boolean
    description?: boolean
    providerId?: boolean
    systemPrompt?: boolean
    modelOverride?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type AiAgentOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "status" | "description" | "providerId" | "systemPrompt" | "modelOverride" | "createdAt" | "updatedAt", ExtArgs["result"]["aiAgent"]>
  export type AiAgentInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    provider?: boolean | AiProviderDefaultArgs<ExtArgs>
    tools?: boolean | AiAgent$toolsArgs<ExtArgs>
    _count?: boolean | AiAgentCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type AiAgentIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    provider?: boolean | AiProviderDefaultArgs<ExtArgs>
  }
  export type AiAgentIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    provider?: boolean | AiProviderDefaultArgs<ExtArgs>
  }

  export type $AiAgentPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AiAgent"
    objects: {
      provider: Prisma.$AiProviderPayload<ExtArgs>
      tools: Prisma.$AiAgentToolPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      status: $Enums.AiAgentStatus
      description: string | null
      providerId: string
      systemPrompt: string
      modelOverride: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["aiAgent"]>
    composites: {}
  }

  type AiAgentGetPayload<S extends boolean | null | undefined | AiAgentDefaultArgs> = $Result.GetResult<Prisma.$AiAgentPayload, S>

  type AiAgentCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AiAgentFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AiAgentCountAggregateInputType | true
    }

  export interface AiAgentDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AiAgent'], meta: { name: 'AiAgent' } }
    /**
     * Find zero or one AiAgent that matches the filter.
     * @param {AiAgentFindUniqueArgs} args - Arguments to find a AiAgent
     * @example
     * // Get one AiAgent
     * const aiAgent = await prisma.aiAgent.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AiAgentFindUniqueArgs>(args: SelectSubset<T, AiAgentFindUniqueArgs<ExtArgs>>): Prisma__AiAgentClient<$Result.GetResult<Prisma.$AiAgentPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AiAgent that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AiAgentFindUniqueOrThrowArgs} args - Arguments to find a AiAgent
     * @example
     * // Get one AiAgent
     * const aiAgent = await prisma.aiAgent.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AiAgentFindUniqueOrThrowArgs>(args: SelectSubset<T, AiAgentFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AiAgentClient<$Result.GetResult<Prisma.$AiAgentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AiAgent that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiAgentFindFirstArgs} args - Arguments to find a AiAgent
     * @example
     * // Get one AiAgent
     * const aiAgent = await prisma.aiAgent.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AiAgentFindFirstArgs>(args?: SelectSubset<T, AiAgentFindFirstArgs<ExtArgs>>): Prisma__AiAgentClient<$Result.GetResult<Prisma.$AiAgentPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AiAgent that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiAgentFindFirstOrThrowArgs} args - Arguments to find a AiAgent
     * @example
     * // Get one AiAgent
     * const aiAgent = await prisma.aiAgent.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AiAgentFindFirstOrThrowArgs>(args?: SelectSubset<T, AiAgentFindFirstOrThrowArgs<ExtArgs>>): Prisma__AiAgentClient<$Result.GetResult<Prisma.$AiAgentPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AiAgents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiAgentFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AiAgents
     * const aiAgents = await prisma.aiAgent.findMany()
     * 
     * // Get first 10 AiAgents
     * const aiAgents = await prisma.aiAgent.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const aiAgentWithIdOnly = await prisma.aiAgent.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AiAgentFindManyArgs>(args?: SelectSubset<T, AiAgentFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiAgentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AiAgent.
     * @param {AiAgentCreateArgs} args - Arguments to create a AiAgent.
     * @example
     * // Create one AiAgent
     * const AiAgent = await prisma.aiAgent.create({
     *   data: {
     *     // ... data to create a AiAgent
     *   }
     * })
     * 
     */
    create<T extends AiAgentCreateArgs>(args: SelectSubset<T, AiAgentCreateArgs<ExtArgs>>): Prisma__AiAgentClient<$Result.GetResult<Prisma.$AiAgentPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AiAgents.
     * @param {AiAgentCreateManyArgs} args - Arguments to create many AiAgents.
     * @example
     * // Create many AiAgents
     * const aiAgent = await prisma.aiAgent.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AiAgentCreateManyArgs>(args?: SelectSubset<T, AiAgentCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AiAgents and returns the data saved in the database.
     * @param {AiAgentCreateManyAndReturnArgs} args - Arguments to create many AiAgents.
     * @example
     * // Create many AiAgents
     * const aiAgent = await prisma.aiAgent.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AiAgents and only return the `id`
     * const aiAgentWithIdOnly = await prisma.aiAgent.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AiAgentCreateManyAndReturnArgs>(args?: SelectSubset<T, AiAgentCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiAgentPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AiAgent.
     * @param {AiAgentDeleteArgs} args - Arguments to delete one AiAgent.
     * @example
     * // Delete one AiAgent
     * const AiAgent = await prisma.aiAgent.delete({
     *   where: {
     *     // ... filter to delete one AiAgent
     *   }
     * })
     * 
     */
    delete<T extends AiAgentDeleteArgs>(args: SelectSubset<T, AiAgentDeleteArgs<ExtArgs>>): Prisma__AiAgentClient<$Result.GetResult<Prisma.$AiAgentPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AiAgent.
     * @param {AiAgentUpdateArgs} args - Arguments to update one AiAgent.
     * @example
     * // Update one AiAgent
     * const aiAgent = await prisma.aiAgent.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AiAgentUpdateArgs>(args: SelectSubset<T, AiAgentUpdateArgs<ExtArgs>>): Prisma__AiAgentClient<$Result.GetResult<Prisma.$AiAgentPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AiAgents.
     * @param {AiAgentDeleteManyArgs} args - Arguments to filter AiAgents to delete.
     * @example
     * // Delete a few AiAgents
     * const { count } = await prisma.aiAgent.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AiAgentDeleteManyArgs>(args?: SelectSubset<T, AiAgentDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AiAgents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiAgentUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AiAgents
     * const aiAgent = await prisma.aiAgent.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AiAgentUpdateManyArgs>(args: SelectSubset<T, AiAgentUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AiAgents and returns the data updated in the database.
     * @param {AiAgentUpdateManyAndReturnArgs} args - Arguments to update many AiAgents.
     * @example
     * // Update many AiAgents
     * const aiAgent = await prisma.aiAgent.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AiAgents and only return the `id`
     * const aiAgentWithIdOnly = await prisma.aiAgent.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AiAgentUpdateManyAndReturnArgs>(args: SelectSubset<T, AiAgentUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiAgentPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AiAgent.
     * @param {AiAgentUpsertArgs} args - Arguments to update or create a AiAgent.
     * @example
     * // Update or create a AiAgent
     * const aiAgent = await prisma.aiAgent.upsert({
     *   create: {
     *     // ... data to create a AiAgent
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AiAgent we want to update
     *   }
     * })
     */
    upsert<T extends AiAgentUpsertArgs>(args: SelectSubset<T, AiAgentUpsertArgs<ExtArgs>>): Prisma__AiAgentClient<$Result.GetResult<Prisma.$AiAgentPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AiAgents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiAgentCountArgs} args - Arguments to filter AiAgents to count.
     * @example
     * // Count the number of AiAgents
     * const count = await prisma.aiAgent.count({
     *   where: {
     *     // ... the filter for the AiAgents we want to count
     *   }
     * })
    **/
    count<T extends AiAgentCountArgs>(
      args?: Subset<T, AiAgentCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AiAgentCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AiAgent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiAgentAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AiAgentAggregateArgs>(args: Subset<T, AiAgentAggregateArgs>): Prisma.PrismaPromise<GetAiAgentAggregateType<T>>

    /**
     * Group by AiAgent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiAgentGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AiAgentGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AiAgentGroupByArgs['orderBy'] }
        : { orderBy?: AiAgentGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AiAgentGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAiAgentGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AiAgent model
   */
  readonly fields: AiAgentFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AiAgent.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AiAgentClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    provider<T extends AiProviderDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AiProviderDefaultArgs<ExtArgs>>): Prisma__AiProviderClient<$Result.GetResult<Prisma.$AiProviderPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    tools<T extends AiAgent$toolsArgs<ExtArgs> = {}>(args?: Subset<T, AiAgent$toolsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiAgentToolPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AiAgent model
   */
  interface AiAgentFieldRefs {
    readonly id: FieldRef<"AiAgent", 'String'>
    readonly name: FieldRef<"AiAgent", 'String'>
    readonly status: FieldRef<"AiAgent", 'AiAgentStatus'>
    readonly description: FieldRef<"AiAgent", 'String'>
    readonly providerId: FieldRef<"AiAgent", 'String'>
    readonly systemPrompt: FieldRef<"AiAgent", 'String'>
    readonly modelOverride: FieldRef<"AiAgent", 'String'>
    readonly createdAt: FieldRef<"AiAgent", 'DateTime'>
    readonly updatedAt: FieldRef<"AiAgent", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AiAgent findUnique
   */
  export type AiAgentFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgent
     */
    select?: AiAgentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgent
     */
    omit?: AiAgentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentInclude<ExtArgs> | null
    /**
     * Filter, which AiAgent to fetch.
     */
    where: AiAgentWhereUniqueInput
  }

  /**
   * AiAgent findUniqueOrThrow
   */
  export type AiAgentFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgent
     */
    select?: AiAgentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgent
     */
    omit?: AiAgentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentInclude<ExtArgs> | null
    /**
     * Filter, which AiAgent to fetch.
     */
    where: AiAgentWhereUniqueInput
  }

  /**
   * AiAgent findFirst
   */
  export type AiAgentFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgent
     */
    select?: AiAgentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgent
     */
    omit?: AiAgentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentInclude<ExtArgs> | null
    /**
     * Filter, which AiAgent to fetch.
     */
    where?: AiAgentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiAgents to fetch.
     */
    orderBy?: AiAgentOrderByWithRelationInput | AiAgentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AiAgents.
     */
    cursor?: AiAgentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiAgents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiAgents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AiAgents.
     */
    distinct?: AiAgentScalarFieldEnum | AiAgentScalarFieldEnum[]
  }

  /**
   * AiAgent findFirstOrThrow
   */
  export type AiAgentFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgent
     */
    select?: AiAgentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgent
     */
    omit?: AiAgentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentInclude<ExtArgs> | null
    /**
     * Filter, which AiAgent to fetch.
     */
    where?: AiAgentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiAgents to fetch.
     */
    orderBy?: AiAgentOrderByWithRelationInput | AiAgentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AiAgents.
     */
    cursor?: AiAgentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiAgents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiAgents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AiAgents.
     */
    distinct?: AiAgentScalarFieldEnum | AiAgentScalarFieldEnum[]
  }

  /**
   * AiAgent findMany
   */
  export type AiAgentFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgent
     */
    select?: AiAgentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgent
     */
    omit?: AiAgentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentInclude<ExtArgs> | null
    /**
     * Filter, which AiAgents to fetch.
     */
    where?: AiAgentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiAgents to fetch.
     */
    orderBy?: AiAgentOrderByWithRelationInput | AiAgentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AiAgents.
     */
    cursor?: AiAgentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiAgents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiAgents.
     */
    skip?: number
    distinct?: AiAgentScalarFieldEnum | AiAgentScalarFieldEnum[]
  }

  /**
   * AiAgent create
   */
  export type AiAgentCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgent
     */
    select?: AiAgentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgent
     */
    omit?: AiAgentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentInclude<ExtArgs> | null
    /**
     * The data needed to create a AiAgent.
     */
    data: XOR<AiAgentCreateInput, AiAgentUncheckedCreateInput>
  }

  /**
   * AiAgent createMany
   */
  export type AiAgentCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AiAgents.
     */
    data: AiAgentCreateManyInput | AiAgentCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AiAgent createManyAndReturn
   */
  export type AiAgentCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgent
     */
    select?: AiAgentSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgent
     */
    omit?: AiAgentOmit<ExtArgs> | null
    /**
     * The data used to create many AiAgents.
     */
    data: AiAgentCreateManyInput | AiAgentCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AiAgent update
   */
  export type AiAgentUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgent
     */
    select?: AiAgentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgent
     */
    omit?: AiAgentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentInclude<ExtArgs> | null
    /**
     * The data needed to update a AiAgent.
     */
    data: XOR<AiAgentUpdateInput, AiAgentUncheckedUpdateInput>
    /**
     * Choose, which AiAgent to update.
     */
    where: AiAgentWhereUniqueInput
  }

  /**
   * AiAgent updateMany
   */
  export type AiAgentUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AiAgents.
     */
    data: XOR<AiAgentUpdateManyMutationInput, AiAgentUncheckedUpdateManyInput>
    /**
     * Filter which AiAgents to update
     */
    where?: AiAgentWhereInput
    /**
     * Limit how many AiAgents to update.
     */
    limit?: number
  }

  /**
   * AiAgent updateManyAndReturn
   */
  export type AiAgentUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgent
     */
    select?: AiAgentSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgent
     */
    omit?: AiAgentOmit<ExtArgs> | null
    /**
     * The data used to update AiAgents.
     */
    data: XOR<AiAgentUpdateManyMutationInput, AiAgentUncheckedUpdateManyInput>
    /**
     * Filter which AiAgents to update
     */
    where?: AiAgentWhereInput
    /**
     * Limit how many AiAgents to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AiAgent upsert
   */
  export type AiAgentUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgent
     */
    select?: AiAgentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgent
     */
    omit?: AiAgentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentInclude<ExtArgs> | null
    /**
     * The filter to search for the AiAgent to update in case it exists.
     */
    where: AiAgentWhereUniqueInput
    /**
     * In case the AiAgent found by the `where` argument doesn't exist, create a new AiAgent with this data.
     */
    create: XOR<AiAgentCreateInput, AiAgentUncheckedCreateInput>
    /**
     * In case the AiAgent was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AiAgentUpdateInput, AiAgentUncheckedUpdateInput>
  }

  /**
   * AiAgent delete
   */
  export type AiAgentDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgent
     */
    select?: AiAgentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgent
     */
    omit?: AiAgentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentInclude<ExtArgs> | null
    /**
     * Filter which AiAgent to delete.
     */
    where: AiAgentWhereUniqueInput
  }

  /**
   * AiAgent deleteMany
   */
  export type AiAgentDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AiAgents to delete
     */
    where?: AiAgentWhereInput
    /**
     * Limit how many AiAgents to delete.
     */
    limit?: number
  }

  /**
   * AiAgent.tools
   */
  export type AiAgent$toolsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgentTool
     */
    select?: AiAgentToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgentTool
     */
    omit?: AiAgentToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentToolInclude<ExtArgs> | null
    where?: AiAgentToolWhereInput
    orderBy?: AiAgentToolOrderByWithRelationInput | AiAgentToolOrderByWithRelationInput[]
    cursor?: AiAgentToolWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AiAgentToolScalarFieldEnum | AiAgentToolScalarFieldEnum[]
  }

  /**
   * AiAgent without action
   */
  export type AiAgentDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgent
     */
    select?: AiAgentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgent
     */
    omit?: AiAgentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentInclude<ExtArgs> | null
  }


  /**
   * Model AiTool
   */

  export type AggregateAiTool = {
    _count: AiToolCountAggregateOutputType | null
    _min: AiToolMinAggregateOutputType | null
    _max: AiToolMaxAggregateOutputType | null
  }

  export type AiToolMinAggregateOutputType = {
    id: string | null
    name: string | null
    status: $Enums.AiToolStatus | null
    source: $Enums.AiToolSource | null
    description: string | null
    adapter: string | null
    binary: string | null
    category: string | null
    riskTier: string | null
    notes: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AiToolMaxAggregateOutputType = {
    id: string | null
    name: string | null
    status: $Enums.AiToolStatus | null
    source: $Enums.AiToolSource | null
    description: string | null
    adapter: string | null
    binary: string | null
    category: string | null
    riskTier: string | null
    notes: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AiToolCountAggregateOutputType = {
    id: number
    name: number
    status: number
    source: number
    description: number
    adapter: number
    binary: number
    category: number
    riskTier: number
    notes: number
    inputSchema: number
    outputSchema: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type AiToolMinAggregateInputType = {
    id?: true
    name?: true
    status?: true
    source?: true
    description?: true
    adapter?: true
    binary?: true
    category?: true
    riskTier?: true
    notes?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AiToolMaxAggregateInputType = {
    id?: true
    name?: true
    status?: true
    source?: true
    description?: true
    adapter?: true
    binary?: true
    category?: true
    riskTier?: true
    notes?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AiToolCountAggregateInputType = {
    id?: true
    name?: true
    status?: true
    source?: true
    description?: true
    adapter?: true
    binary?: true
    category?: true
    riskTier?: true
    notes?: true
    inputSchema?: true
    outputSchema?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type AiToolAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AiTool to aggregate.
     */
    where?: AiToolWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiTools to fetch.
     */
    orderBy?: AiToolOrderByWithRelationInput | AiToolOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AiToolWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiTools from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiTools.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AiTools
    **/
    _count?: true | AiToolCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AiToolMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AiToolMaxAggregateInputType
  }

  export type GetAiToolAggregateType<T extends AiToolAggregateArgs> = {
        [P in keyof T & keyof AggregateAiTool]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAiTool[P]>
      : GetScalarType<T[P], AggregateAiTool[P]>
  }




  export type AiToolGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AiToolWhereInput
    orderBy?: AiToolOrderByWithAggregationInput | AiToolOrderByWithAggregationInput[]
    by: AiToolScalarFieldEnum[] | AiToolScalarFieldEnum
    having?: AiToolScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AiToolCountAggregateInputType | true
    _min?: AiToolMinAggregateInputType
    _max?: AiToolMaxAggregateInputType
  }

  export type AiToolGroupByOutputType = {
    id: string
    name: string
    status: $Enums.AiToolStatus
    source: $Enums.AiToolSource
    description: string | null
    adapter: string | null
    binary: string | null
    category: string
    riskTier: string
    notes: string | null
    inputSchema: JsonValue
    outputSchema: JsonValue
    createdAt: Date
    updatedAt: Date
    _count: AiToolCountAggregateOutputType | null
    _min: AiToolMinAggregateOutputType | null
    _max: AiToolMaxAggregateOutputType | null
  }

  type GetAiToolGroupByPayload<T extends AiToolGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AiToolGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AiToolGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AiToolGroupByOutputType[P]>
            : GetScalarType<T[P], AiToolGroupByOutputType[P]>
        }
      >
    >


  export type AiToolSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    status?: boolean
    source?: boolean
    description?: boolean
    adapter?: boolean
    binary?: boolean
    category?: boolean
    riskTier?: boolean
    notes?: boolean
    inputSchema?: boolean
    outputSchema?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    agents?: boolean | AiTool$agentsArgs<ExtArgs>
    _count?: boolean | AiToolCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aiTool"]>

  export type AiToolSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    status?: boolean
    source?: boolean
    description?: boolean
    adapter?: boolean
    binary?: boolean
    category?: boolean
    riskTier?: boolean
    notes?: boolean
    inputSchema?: boolean
    outputSchema?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["aiTool"]>

  export type AiToolSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    status?: boolean
    source?: boolean
    description?: boolean
    adapter?: boolean
    binary?: boolean
    category?: boolean
    riskTier?: boolean
    notes?: boolean
    inputSchema?: boolean
    outputSchema?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["aiTool"]>

  export type AiToolSelectScalar = {
    id?: boolean
    name?: boolean
    status?: boolean
    source?: boolean
    description?: boolean
    adapter?: boolean
    binary?: boolean
    category?: boolean
    riskTier?: boolean
    notes?: boolean
    inputSchema?: boolean
    outputSchema?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type AiToolOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "status" | "source" | "description" | "adapter" | "binary" | "category" | "riskTier" | "notes" | "inputSchema" | "outputSchema" | "createdAt" | "updatedAt", ExtArgs["result"]["aiTool"]>
  export type AiToolInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    agents?: boolean | AiTool$agentsArgs<ExtArgs>
    _count?: boolean | AiToolCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type AiToolIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type AiToolIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $AiToolPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AiTool"
    objects: {
      agents: Prisma.$AiAgentToolPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      status: $Enums.AiToolStatus
      source: $Enums.AiToolSource
      description: string | null
      adapter: string | null
      binary: string | null
      category: string
      riskTier: string
      notes: string | null
      inputSchema: Prisma.JsonValue
      outputSchema: Prisma.JsonValue
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["aiTool"]>
    composites: {}
  }

  type AiToolGetPayload<S extends boolean | null | undefined | AiToolDefaultArgs> = $Result.GetResult<Prisma.$AiToolPayload, S>

  type AiToolCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AiToolFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AiToolCountAggregateInputType | true
    }

  export interface AiToolDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AiTool'], meta: { name: 'AiTool' } }
    /**
     * Find zero or one AiTool that matches the filter.
     * @param {AiToolFindUniqueArgs} args - Arguments to find a AiTool
     * @example
     * // Get one AiTool
     * const aiTool = await prisma.aiTool.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AiToolFindUniqueArgs>(args: SelectSubset<T, AiToolFindUniqueArgs<ExtArgs>>): Prisma__AiToolClient<$Result.GetResult<Prisma.$AiToolPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AiTool that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AiToolFindUniqueOrThrowArgs} args - Arguments to find a AiTool
     * @example
     * // Get one AiTool
     * const aiTool = await prisma.aiTool.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AiToolFindUniqueOrThrowArgs>(args: SelectSubset<T, AiToolFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AiToolClient<$Result.GetResult<Prisma.$AiToolPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AiTool that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiToolFindFirstArgs} args - Arguments to find a AiTool
     * @example
     * // Get one AiTool
     * const aiTool = await prisma.aiTool.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AiToolFindFirstArgs>(args?: SelectSubset<T, AiToolFindFirstArgs<ExtArgs>>): Prisma__AiToolClient<$Result.GetResult<Prisma.$AiToolPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AiTool that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiToolFindFirstOrThrowArgs} args - Arguments to find a AiTool
     * @example
     * // Get one AiTool
     * const aiTool = await prisma.aiTool.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AiToolFindFirstOrThrowArgs>(args?: SelectSubset<T, AiToolFindFirstOrThrowArgs<ExtArgs>>): Prisma__AiToolClient<$Result.GetResult<Prisma.$AiToolPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AiTools that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiToolFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AiTools
     * const aiTools = await prisma.aiTool.findMany()
     * 
     * // Get first 10 AiTools
     * const aiTools = await prisma.aiTool.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const aiToolWithIdOnly = await prisma.aiTool.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AiToolFindManyArgs>(args?: SelectSubset<T, AiToolFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiToolPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AiTool.
     * @param {AiToolCreateArgs} args - Arguments to create a AiTool.
     * @example
     * // Create one AiTool
     * const AiTool = await prisma.aiTool.create({
     *   data: {
     *     // ... data to create a AiTool
     *   }
     * })
     * 
     */
    create<T extends AiToolCreateArgs>(args: SelectSubset<T, AiToolCreateArgs<ExtArgs>>): Prisma__AiToolClient<$Result.GetResult<Prisma.$AiToolPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AiTools.
     * @param {AiToolCreateManyArgs} args - Arguments to create many AiTools.
     * @example
     * // Create many AiTools
     * const aiTool = await prisma.aiTool.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AiToolCreateManyArgs>(args?: SelectSubset<T, AiToolCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AiTools and returns the data saved in the database.
     * @param {AiToolCreateManyAndReturnArgs} args - Arguments to create many AiTools.
     * @example
     * // Create many AiTools
     * const aiTool = await prisma.aiTool.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AiTools and only return the `id`
     * const aiToolWithIdOnly = await prisma.aiTool.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AiToolCreateManyAndReturnArgs>(args?: SelectSubset<T, AiToolCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiToolPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AiTool.
     * @param {AiToolDeleteArgs} args - Arguments to delete one AiTool.
     * @example
     * // Delete one AiTool
     * const AiTool = await prisma.aiTool.delete({
     *   where: {
     *     // ... filter to delete one AiTool
     *   }
     * })
     * 
     */
    delete<T extends AiToolDeleteArgs>(args: SelectSubset<T, AiToolDeleteArgs<ExtArgs>>): Prisma__AiToolClient<$Result.GetResult<Prisma.$AiToolPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AiTool.
     * @param {AiToolUpdateArgs} args - Arguments to update one AiTool.
     * @example
     * // Update one AiTool
     * const aiTool = await prisma.aiTool.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AiToolUpdateArgs>(args: SelectSubset<T, AiToolUpdateArgs<ExtArgs>>): Prisma__AiToolClient<$Result.GetResult<Prisma.$AiToolPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AiTools.
     * @param {AiToolDeleteManyArgs} args - Arguments to filter AiTools to delete.
     * @example
     * // Delete a few AiTools
     * const { count } = await prisma.aiTool.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AiToolDeleteManyArgs>(args?: SelectSubset<T, AiToolDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AiTools.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiToolUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AiTools
     * const aiTool = await prisma.aiTool.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AiToolUpdateManyArgs>(args: SelectSubset<T, AiToolUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AiTools and returns the data updated in the database.
     * @param {AiToolUpdateManyAndReturnArgs} args - Arguments to update many AiTools.
     * @example
     * // Update many AiTools
     * const aiTool = await prisma.aiTool.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AiTools and only return the `id`
     * const aiToolWithIdOnly = await prisma.aiTool.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AiToolUpdateManyAndReturnArgs>(args: SelectSubset<T, AiToolUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiToolPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AiTool.
     * @param {AiToolUpsertArgs} args - Arguments to update or create a AiTool.
     * @example
     * // Update or create a AiTool
     * const aiTool = await prisma.aiTool.upsert({
     *   create: {
     *     // ... data to create a AiTool
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AiTool we want to update
     *   }
     * })
     */
    upsert<T extends AiToolUpsertArgs>(args: SelectSubset<T, AiToolUpsertArgs<ExtArgs>>): Prisma__AiToolClient<$Result.GetResult<Prisma.$AiToolPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AiTools.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiToolCountArgs} args - Arguments to filter AiTools to count.
     * @example
     * // Count the number of AiTools
     * const count = await prisma.aiTool.count({
     *   where: {
     *     // ... the filter for the AiTools we want to count
     *   }
     * })
    **/
    count<T extends AiToolCountArgs>(
      args?: Subset<T, AiToolCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AiToolCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AiTool.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiToolAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AiToolAggregateArgs>(args: Subset<T, AiToolAggregateArgs>): Prisma.PrismaPromise<GetAiToolAggregateType<T>>

    /**
     * Group by AiTool.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiToolGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AiToolGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AiToolGroupByArgs['orderBy'] }
        : { orderBy?: AiToolGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AiToolGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAiToolGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AiTool model
   */
  readonly fields: AiToolFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AiTool.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AiToolClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    agents<T extends AiTool$agentsArgs<ExtArgs> = {}>(args?: Subset<T, AiTool$agentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiAgentToolPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AiTool model
   */
  interface AiToolFieldRefs {
    readonly id: FieldRef<"AiTool", 'String'>
    readonly name: FieldRef<"AiTool", 'String'>
    readonly status: FieldRef<"AiTool", 'AiToolStatus'>
    readonly source: FieldRef<"AiTool", 'AiToolSource'>
    readonly description: FieldRef<"AiTool", 'String'>
    readonly adapter: FieldRef<"AiTool", 'String'>
    readonly binary: FieldRef<"AiTool", 'String'>
    readonly category: FieldRef<"AiTool", 'String'>
    readonly riskTier: FieldRef<"AiTool", 'String'>
    readonly notes: FieldRef<"AiTool", 'String'>
    readonly inputSchema: FieldRef<"AiTool", 'Json'>
    readonly outputSchema: FieldRef<"AiTool", 'Json'>
    readonly createdAt: FieldRef<"AiTool", 'DateTime'>
    readonly updatedAt: FieldRef<"AiTool", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AiTool findUnique
   */
  export type AiToolFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiTool
     */
    select?: AiToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiTool
     */
    omit?: AiToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiToolInclude<ExtArgs> | null
    /**
     * Filter, which AiTool to fetch.
     */
    where: AiToolWhereUniqueInput
  }

  /**
   * AiTool findUniqueOrThrow
   */
  export type AiToolFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiTool
     */
    select?: AiToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiTool
     */
    omit?: AiToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiToolInclude<ExtArgs> | null
    /**
     * Filter, which AiTool to fetch.
     */
    where: AiToolWhereUniqueInput
  }

  /**
   * AiTool findFirst
   */
  export type AiToolFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiTool
     */
    select?: AiToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiTool
     */
    omit?: AiToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiToolInclude<ExtArgs> | null
    /**
     * Filter, which AiTool to fetch.
     */
    where?: AiToolWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiTools to fetch.
     */
    orderBy?: AiToolOrderByWithRelationInput | AiToolOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AiTools.
     */
    cursor?: AiToolWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiTools from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiTools.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AiTools.
     */
    distinct?: AiToolScalarFieldEnum | AiToolScalarFieldEnum[]
  }

  /**
   * AiTool findFirstOrThrow
   */
  export type AiToolFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiTool
     */
    select?: AiToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiTool
     */
    omit?: AiToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiToolInclude<ExtArgs> | null
    /**
     * Filter, which AiTool to fetch.
     */
    where?: AiToolWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiTools to fetch.
     */
    orderBy?: AiToolOrderByWithRelationInput | AiToolOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AiTools.
     */
    cursor?: AiToolWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiTools from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiTools.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AiTools.
     */
    distinct?: AiToolScalarFieldEnum | AiToolScalarFieldEnum[]
  }

  /**
   * AiTool findMany
   */
  export type AiToolFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiTool
     */
    select?: AiToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiTool
     */
    omit?: AiToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiToolInclude<ExtArgs> | null
    /**
     * Filter, which AiTools to fetch.
     */
    where?: AiToolWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiTools to fetch.
     */
    orderBy?: AiToolOrderByWithRelationInput | AiToolOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AiTools.
     */
    cursor?: AiToolWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiTools from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiTools.
     */
    skip?: number
    distinct?: AiToolScalarFieldEnum | AiToolScalarFieldEnum[]
  }

  /**
   * AiTool create
   */
  export type AiToolCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiTool
     */
    select?: AiToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiTool
     */
    omit?: AiToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiToolInclude<ExtArgs> | null
    /**
     * The data needed to create a AiTool.
     */
    data: XOR<AiToolCreateInput, AiToolUncheckedCreateInput>
  }

  /**
   * AiTool createMany
   */
  export type AiToolCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AiTools.
     */
    data: AiToolCreateManyInput | AiToolCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AiTool createManyAndReturn
   */
  export type AiToolCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiTool
     */
    select?: AiToolSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AiTool
     */
    omit?: AiToolOmit<ExtArgs> | null
    /**
     * The data used to create many AiTools.
     */
    data: AiToolCreateManyInput | AiToolCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AiTool update
   */
  export type AiToolUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiTool
     */
    select?: AiToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiTool
     */
    omit?: AiToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiToolInclude<ExtArgs> | null
    /**
     * The data needed to update a AiTool.
     */
    data: XOR<AiToolUpdateInput, AiToolUncheckedUpdateInput>
    /**
     * Choose, which AiTool to update.
     */
    where: AiToolWhereUniqueInput
  }

  /**
   * AiTool updateMany
   */
  export type AiToolUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AiTools.
     */
    data: XOR<AiToolUpdateManyMutationInput, AiToolUncheckedUpdateManyInput>
    /**
     * Filter which AiTools to update
     */
    where?: AiToolWhereInput
    /**
     * Limit how many AiTools to update.
     */
    limit?: number
  }

  /**
   * AiTool updateManyAndReturn
   */
  export type AiToolUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiTool
     */
    select?: AiToolSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AiTool
     */
    omit?: AiToolOmit<ExtArgs> | null
    /**
     * The data used to update AiTools.
     */
    data: XOR<AiToolUpdateManyMutationInput, AiToolUncheckedUpdateManyInput>
    /**
     * Filter which AiTools to update
     */
    where?: AiToolWhereInput
    /**
     * Limit how many AiTools to update.
     */
    limit?: number
  }

  /**
   * AiTool upsert
   */
  export type AiToolUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiTool
     */
    select?: AiToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiTool
     */
    omit?: AiToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiToolInclude<ExtArgs> | null
    /**
     * The filter to search for the AiTool to update in case it exists.
     */
    where: AiToolWhereUniqueInput
    /**
     * In case the AiTool found by the `where` argument doesn't exist, create a new AiTool with this data.
     */
    create: XOR<AiToolCreateInput, AiToolUncheckedCreateInput>
    /**
     * In case the AiTool was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AiToolUpdateInput, AiToolUncheckedUpdateInput>
  }

  /**
   * AiTool delete
   */
  export type AiToolDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiTool
     */
    select?: AiToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiTool
     */
    omit?: AiToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiToolInclude<ExtArgs> | null
    /**
     * Filter which AiTool to delete.
     */
    where: AiToolWhereUniqueInput
  }

  /**
   * AiTool deleteMany
   */
  export type AiToolDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AiTools to delete
     */
    where?: AiToolWhereInput
    /**
     * Limit how many AiTools to delete.
     */
    limit?: number
  }

  /**
   * AiTool.agents
   */
  export type AiTool$agentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgentTool
     */
    select?: AiAgentToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgentTool
     */
    omit?: AiAgentToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentToolInclude<ExtArgs> | null
    where?: AiAgentToolWhereInput
    orderBy?: AiAgentToolOrderByWithRelationInput | AiAgentToolOrderByWithRelationInput[]
    cursor?: AiAgentToolWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AiAgentToolScalarFieldEnum | AiAgentToolScalarFieldEnum[]
  }

  /**
   * AiTool without action
   */
  export type AiToolDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiTool
     */
    select?: AiToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiTool
     */
    omit?: AiToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiToolInclude<ExtArgs> | null
  }


  /**
   * Model AiAgentTool
   */

  export type AggregateAiAgentTool = {
    _count: AiAgentToolCountAggregateOutputType | null
    _avg: AiAgentToolAvgAggregateOutputType | null
    _sum: AiAgentToolSumAggregateOutputType | null
    _min: AiAgentToolMinAggregateOutputType | null
    _max: AiAgentToolMaxAggregateOutputType | null
  }

  export type AiAgentToolAvgAggregateOutputType = {
    ord: number | null
  }

  export type AiAgentToolSumAggregateOutputType = {
    ord: number | null
  }

  export type AiAgentToolMinAggregateOutputType = {
    agentId: string | null
    toolId: string | null
    ord: number | null
  }

  export type AiAgentToolMaxAggregateOutputType = {
    agentId: string | null
    toolId: string | null
    ord: number | null
  }

  export type AiAgentToolCountAggregateOutputType = {
    agentId: number
    toolId: number
    ord: number
    _all: number
  }


  export type AiAgentToolAvgAggregateInputType = {
    ord?: true
  }

  export type AiAgentToolSumAggregateInputType = {
    ord?: true
  }

  export type AiAgentToolMinAggregateInputType = {
    agentId?: true
    toolId?: true
    ord?: true
  }

  export type AiAgentToolMaxAggregateInputType = {
    agentId?: true
    toolId?: true
    ord?: true
  }

  export type AiAgentToolCountAggregateInputType = {
    agentId?: true
    toolId?: true
    ord?: true
    _all?: true
  }

  export type AiAgentToolAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AiAgentTool to aggregate.
     */
    where?: AiAgentToolWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiAgentTools to fetch.
     */
    orderBy?: AiAgentToolOrderByWithRelationInput | AiAgentToolOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AiAgentToolWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiAgentTools from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiAgentTools.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AiAgentTools
    **/
    _count?: true | AiAgentToolCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AiAgentToolAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AiAgentToolSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AiAgentToolMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AiAgentToolMaxAggregateInputType
  }

  export type GetAiAgentToolAggregateType<T extends AiAgentToolAggregateArgs> = {
        [P in keyof T & keyof AggregateAiAgentTool]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAiAgentTool[P]>
      : GetScalarType<T[P], AggregateAiAgentTool[P]>
  }




  export type AiAgentToolGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AiAgentToolWhereInput
    orderBy?: AiAgentToolOrderByWithAggregationInput | AiAgentToolOrderByWithAggregationInput[]
    by: AiAgentToolScalarFieldEnum[] | AiAgentToolScalarFieldEnum
    having?: AiAgentToolScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AiAgentToolCountAggregateInputType | true
    _avg?: AiAgentToolAvgAggregateInputType
    _sum?: AiAgentToolSumAggregateInputType
    _min?: AiAgentToolMinAggregateInputType
    _max?: AiAgentToolMaxAggregateInputType
  }

  export type AiAgentToolGroupByOutputType = {
    agentId: string
    toolId: string
    ord: number
    _count: AiAgentToolCountAggregateOutputType | null
    _avg: AiAgentToolAvgAggregateOutputType | null
    _sum: AiAgentToolSumAggregateOutputType | null
    _min: AiAgentToolMinAggregateOutputType | null
    _max: AiAgentToolMaxAggregateOutputType | null
  }

  type GetAiAgentToolGroupByPayload<T extends AiAgentToolGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AiAgentToolGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AiAgentToolGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AiAgentToolGroupByOutputType[P]>
            : GetScalarType<T[P], AiAgentToolGroupByOutputType[P]>
        }
      >
    >


  export type AiAgentToolSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    agentId?: boolean
    toolId?: boolean
    ord?: boolean
    agent?: boolean | AiAgentDefaultArgs<ExtArgs>
    tool?: boolean | AiToolDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aiAgentTool"]>

  export type AiAgentToolSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    agentId?: boolean
    toolId?: boolean
    ord?: boolean
    agent?: boolean | AiAgentDefaultArgs<ExtArgs>
    tool?: boolean | AiToolDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aiAgentTool"]>

  export type AiAgentToolSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    agentId?: boolean
    toolId?: boolean
    ord?: boolean
    agent?: boolean | AiAgentDefaultArgs<ExtArgs>
    tool?: boolean | AiToolDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aiAgentTool"]>

  export type AiAgentToolSelectScalar = {
    agentId?: boolean
    toolId?: boolean
    ord?: boolean
  }

  export type AiAgentToolOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"agentId" | "toolId" | "ord", ExtArgs["result"]["aiAgentTool"]>
  export type AiAgentToolInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    agent?: boolean | AiAgentDefaultArgs<ExtArgs>
    tool?: boolean | AiToolDefaultArgs<ExtArgs>
  }
  export type AiAgentToolIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    agent?: boolean | AiAgentDefaultArgs<ExtArgs>
    tool?: boolean | AiToolDefaultArgs<ExtArgs>
  }
  export type AiAgentToolIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    agent?: boolean | AiAgentDefaultArgs<ExtArgs>
    tool?: boolean | AiToolDefaultArgs<ExtArgs>
  }

  export type $AiAgentToolPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AiAgentTool"
    objects: {
      agent: Prisma.$AiAgentPayload<ExtArgs>
      tool: Prisma.$AiToolPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      agentId: string
      toolId: string
      ord: number
    }, ExtArgs["result"]["aiAgentTool"]>
    composites: {}
  }

  type AiAgentToolGetPayload<S extends boolean | null | undefined | AiAgentToolDefaultArgs> = $Result.GetResult<Prisma.$AiAgentToolPayload, S>

  type AiAgentToolCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AiAgentToolFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AiAgentToolCountAggregateInputType | true
    }

  export interface AiAgentToolDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AiAgentTool'], meta: { name: 'AiAgentTool' } }
    /**
     * Find zero or one AiAgentTool that matches the filter.
     * @param {AiAgentToolFindUniqueArgs} args - Arguments to find a AiAgentTool
     * @example
     * // Get one AiAgentTool
     * const aiAgentTool = await prisma.aiAgentTool.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AiAgentToolFindUniqueArgs>(args: SelectSubset<T, AiAgentToolFindUniqueArgs<ExtArgs>>): Prisma__AiAgentToolClient<$Result.GetResult<Prisma.$AiAgentToolPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AiAgentTool that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AiAgentToolFindUniqueOrThrowArgs} args - Arguments to find a AiAgentTool
     * @example
     * // Get one AiAgentTool
     * const aiAgentTool = await prisma.aiAgentTool.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AiAgentToolFindUniqueOrThrowArgs>(args: SelectSubset<T, AiAgentToolFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AiAgentToolClient<$Result.GetResult<Prisma.$AiAgentToolPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AiAgentTool that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiAgentToolFindFirstArgs} args - Arguments to find a AiAgentTool
     * @example
     * // Get one AiAgentTool
     * const aiAgentTool = await prisma.aiAgentTool.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AiAgentToolFindFirstArgs>(args?: SelectSubset<T, AiAgentToolFindFirstArgs<ExtArgs>>): Prisma__AiAgentToolClient<$Result.GetResult<Prisma.$AiAgentToolPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AiAgentTool that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiAgentToolFindFirstOrThrowArgs} args - Arguments to find a AiAgentTool
     * @example
     * // Get one AiAgentTool
     * const aiAgentTool = await prisma.aiAgentTool.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AiAgentToolFindFirstOrThrowArgs>(args?: SelectSubset<T, AiAgentToolFindFirstOrThrowArgs<ExtArgs>>): Prisma__AiAgentToolClient<$Result.GetResult<Prisma.$AiAgentToolPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AiAgentTools that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiAgentToolFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AiAgentTools
     * const aiAgentTools = await prisma.aiAgentTool.findMany()
     * 
     * // Get first 10 AiAgentTools
     * const aiAgentTools = await prisma.aiAgentTool.findMany({ take: 10 })
     * 
     * // Only select the `agentId`
     * const aiAgentToolWithAgentIdOnly = await prisma.aiAgentTool.findMany({ select: { agentId: true } })
     * 
     */
    findMany<T extends AiAgentToolFindManyArgs>(args?: SelectSubset<T, AiAgentToolFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiAgentToolPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AiAgentTool.
     * @param {AiAgentToolCreateArgs} args - Arguments to create a AiAgentTool.
     * @example
     * // Create one AiAgentTool
     * const AiAgentTool = await prisma.aiAgentTool.create({
     *   data: {
     *     // ... data to create a AiAgentTool
     *   }
     * })
     * 
     */
    create<T extends AiAgentToolCreateArgs>(args: SelectSubset<T, AiAgentToolCreateArgs<ExtArgs>>): Prisma__AiAgentToolClient<$Result.GetResult<Prisma.$AiAgentToolPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AiAgentTools.
     * @param {AiAgentToolCreateManyArgs} args - Arguments to create many AiAgentTools.
     * @example
     * // Create many AiAgentTools
     * const aiAgentTool = await prisma.aiAgentTool.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AiAgentToolCreateManyArgs>(args?: SelectSubset<T, AiAgentToolCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AiAgentTools and returns the data saved in the database.
     * @param {AiAgentToolCreateManyAndReturnArgs} args - Arguments to create many AiAgentTools.
     * @example
     * // Create many AiAgentTools
     * const aiAgentTool = await prisma.aiAgentTool.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AiAgentTools and only return the `agentId`
     * const aiAgentToolWithAgentIdOnly = await prisma.aiAgentTool.createManyAndReturn({
     *   select: { agentId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AiAgentToolCreateManyAndReturnArgs>(args?: SelectSubset<T, AiAgentToolCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiAgentToolPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AiAgentTool.
     * @param {AiAgentToolDeleteArgs} args - Arguments to delete one AiAgentTool.
     * @example
     * // Delete one AiAgentTool
     * const AiAgentTool = await prisma.aiAgentTool.delete({
     *   where: {
     *     // ... filter to delete one AiAgentTool
     *   }
     * })
     * 
     */
    delete<T extends AiAgentToolDeleteArgs>(args: SelectSubset<T, AiAgentToolDeleteArgs<ExtArgs>>): Prisma__AiAgentToolClient<$Result.GetResult<Prisma.$AiAgentToolPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AiAgentTool.
     * @param {AiAgentToolUpdateArgs} args - Arguments to update one AiAgentTool.
     * @example
     * // Update one AiAgentTool
     * const aiAgentTool = await prisma.aiAgentTool.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AiAgentToolUpdateArgs>(args: SelectSubset<T, AiAgentToolUpdateArgs<ExtArgs>>): Prisma__AiAgentToolClient<$Result.GetResult<Prisma.$AiAgentToolPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AiAgentTools.
     * @param {AiAgentToolDeleteManyArgs} args - Arguments to filter AiAgentTools to delete.
     * @example
     * // Delete a few AiAgentTools
     * const { count } = await prisma.aiAgentTool.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AiAgentToolDeleteManyArgs>(args?: SelectSubset<T, AiAgentToolDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AiAgentTools.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiAgentToolUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AiAgentTools
     * const aiAgentTool = await prisma.aiAgentTool.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AiAgentToolUpdateManyArgs>(args: SelectSubset<T, AiAgentToolUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AiAgentTools and returns the data updated in the database.
     * @param {AiAgentToolUpdateManyAndReturnArgs} args - Arguments to update many AiAgentTools.
     * @example
     * // Update many AiAgentTools
     * const aiAgentTool = await prisma.aiAgentTool.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AiAgentTools and only return the `agentId`
     * const aiAgentToolWithAgentIdOnly = await prisma.aiAgentTool.updateManyAndReturn({
     *   select: { agentId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AiAgentToolUpdateManyAndReturnArgs>(args: SelectSubset<T, AiAgentToolUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiAgentToolPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AiAgentTool.
     * @param {AiAgentToolUpsertArgs} args - Arguments to update or create a AiAgentTool.
     * @example
     * // Update or create a AiAgentTool
     * const aiAgentTool = await prisma.aiAgentTool.upsert({
     *   create: {
     *     // ... data to create a AiAgentTool
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AiAgentTool we want to update
     *   }
     * })
     */
    upsert<T extends AiAgentToolUpsertArgs>(args: SelectSubset<T, AiAgentToolUpsertArgs<ExtArgs>>): Prisma__AiAgentToolClient<$Result.GetResult<Prisma.$AiAgentToolPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AiAgentTools.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiAgentToolCountArgs} args - Arguments to filter AiAgentTools to count.
     * @example
     * // Count the number of AiAgentTools
     * const count = await prisma.aiAgentTool.count({
     *   where: {
     *     // ... the filter for the AiAgentTools we want to count
     *   }
     * })
    **/
    count<T extends AiAgentToolCountArgs>(
      args?: Subset<T, AiAgentToolCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AiAgentToolCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AiAgentTool.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiAgentToolAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AiAgentToolAggregateArgs>(args: Subset<T, AiAgentToolAggregateArgs>): Prisma.PrismaPromise<GetAiAgentToolAggregateType<T>>

    /**
     * Group by AiAgentTool.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiAgentToolGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AiAgentToolGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AiAgentToolGroupByArgs['orderBy'] }
        : { orderBy?: AiAgentToolGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AiAgentToolGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAiAgentToolGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AiAgentTool model
   */
  readonly fields: AiAgentToolFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AiAgentTool.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AiAgentToolClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    agent<T extends AiAgentDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AiAgentDefaultArgs<ExtArgs>>): Prisma__AiAgentClient<$Result.GetResult<Prisma.$AiAgentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    tool<T extends AiToolDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AiToolDefaultArgs<ExtArgs>>): Prisma__AiToolClient<$Result.GetResult<Prisma.$AiToolPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AiAgentTool model
   */
  interface AiAgentToolFieldRefs {
    readonly agentId: FieldRef<"AiAgentTool", 'String'>
    readonly toolId: FieldRef<"AiAgentTool", 'String'>
    readonly ord: FieldRef<"AiAgentTool", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * AiAgentTool findUnique
   */
  export type AiAgentToolFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgentTool
     */
    select?: AiAgentToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgentTool
     */
    omit?: AiAgentToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentToolInclude<ExtArgs> | null
    /**
     * Filter, which AiAgentTool to fetch.
     */
    where: AiAgentToolWhereUniqueInput
  }

  /**
   * AiAgentTool findUniqueOrThrow
   */
  export type AiAgentToolFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgentTool
     */
    select?: AiAgentToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgentTool
     */
    omit?: AiAgentToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentToolInclude<ExtArgs> | null
    /**
     * Filter, which AiAgentTool to fetch.
     */
    where: AiAgentToolWhereUniqueInput
  }

  /**
   * AiAgentTool findFirst
   */
  export type AiAgentToolFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgentTool
     */
    select?: AiAgentToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgentTool
     */
    omit?: AiAgentToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentToolInclude<ExtArgs> | null
    /**
     * Filter, which AiAgentTool to fetch.
     */
    where?: AiAgentToolWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiAgentTools to fetch.
     */
    orderBy?: AiAgentToolOrderByWithRelationInput | AiAgentToolOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AiAgentTools.
     */
    cursor?: AiAgentToolWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiAgentTools from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiAgentTools.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AiAgentTools.
     */
    distinct?: AiAgentToolScalarFieldEnum | AiAgentToolScalarFieldEnum[]
  }

  /**
   * AiAgentTool findFirstOrThrow
   */
  export type AiAgentToolFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgentTool
     */
    select?: AiAgentToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgentTool
     */
    omit?: AiAgentToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentToolInclude<ExtArgs> | null
    /**
     * Filter, which AiAgentTool to fetch.
     */
    where?: AiAgentToolWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiAgentTools to fetch.
     */
    orderBy?: AiAgentToolOrderByWithRelationInput | AiAgentToolOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AiAgentTools.
     */
    cursor?: AiAgentToolWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiAgentTools from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiAgentTools.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AiAgentTools.
     */
    distinct?: AiAgentToolScalarFieldEnum | AiAgentToolScalarFieldEnum[]
  }

  /**
   * AiAgentTool findMany
   */
  export type AiAgentToolFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgentTool
     */
    select?: AiAgentToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgentTool
     */
    omit?: AiAgentToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentToolInclude<ExtArgs> | null
    /**
     * Filter, which AiAgentTools to fetch.
     */
    where?: AiAgentToolWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiAgentTools to fetch.
     */
    orderBy?: AiAgentToolOrderByWithRelationInput | AiAgentToolOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AiAgentTools.
     */
    cursor?: AiAgentToolWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiAgentTools from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiAgentTools.
     */
    skip?: number
    distinct?: AiAgentToolScalarFieldEnum | AiAgentToolScalarFieldEnum[]
  }

  /**
   * AiAgentTool create
   */
  export type AiAgentToolCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgentTool
     */
    select?: AiAgentToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgentTool
     */
    omit?: AiAgentToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentToolInclude<ExtArgs> | null
    /**
     * The data needed to create a AiAgentTool.
     */
    data: XOR<AiAgentToolCreateInput, AiAgentToolUncheckedCreateInput>
  }

  /**
   * AiAgentTool createMany
   */
  export type AiAgentToolCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AiAgentTools.
     */
    data: AiAgentToolCreateManyInput | AiAgentToolCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AiAgentTool createManyAndReturn
   */
  export type AiAgentToolCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgentTool
     */
    select?: AiAgentToolSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgentTool
     */
    omit?: AiAgentToolOmit<ExtArgs> | null
    /**
     * The data used to create many AiAgentTools.
     */
    data: AiAgentToolCreateManyInput | AiAgentToolCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentToolIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AiAgentTool update
   */
  export type AiAgentToolUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgentTool
     */
    select?: AiAgentToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgentTool
     */
    omit?: AiAgentToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentToolInclude<ExtArgs> | null
    /**
     * The data needed to update a AiAgentTool.
     */
    data: XOR<AiAgentToolUpdateInput, AiAgentToolUncheckedUpdateInput>
    /**
     * Choose, which AiAgentTool to update.
     */
    where: AiAgentToolWhereUniqueInput
  }

  /**
   * AiAgentTool updateMany
   */
  export type AiAgentToolUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AiAgentTools.
     */
    data: XOR<AiAgentToolUpdateManyMutationInput, AiAgentToolUncheckedUpdateManyInput>
    /**
     * Filter which AiAgentTools to update
     */
    where?: AiAgentToolWhereInput
    /**
     * Limit how many AiAgentTools to update.
     */
    limit?: number
  }

  /**
   * AiAgentTool updateManyAndReturn
   */
  export type AiAgentToolUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgentTool
     */
    select?: AiAgentToolSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgentTool
     */
    omit?: AiAgentToolOmit<ExtArgs> | null
    /**
     * The data used to update AiAgentTools.
     */
    data: XOR<AiAgentToolUpdateManyMutationInput, AiAgentToolUncheckedUpdateManyInput>
    /**
     * Filter which AiAgentTools to update
     */
    where?: AiAgentToolWhereInput
    /**
     * Limit how many AiAgentTools to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentToolIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AiAgentTool upsert
   */
  export type AiAgentToolUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgentTool
     */
    select?: AiAgentToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgentTool
     */
    omit?: AiAgentToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentToolInclude<ExtArgs> | null
    /**
     * The filter to search for the AiAgentTool to update in case it exists.
     */
    where: AiAgentToolWhereUniqueInput
    /**
     * In case the AiAgentTool found by the `where` argument doesn't exist, create a new AiAgentTool with this data.
     */
    create: XOR<AiAgentToolCreateInput, AiAgentToolUncheckedCreateInput>
    /**
     * In case the AiAgentTool was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AiAgentToolUpdateInput, AiAgentToolUncheckedUpdateInput>
  }

  /**
   * AiAgentTool delete
   */
  export type AiAgentToolDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgentTool
     */
    select?: AiAgentToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgentTool
     */
    omit?: AiAgentToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentToolInclude<ExtArgs> | null
    /**
     * Filter which AiAgentTool to delete.
     */
    where: AiAgentToolWhereUniqueInput
  }

  /**
   * AiAgentTool deleteMany
   */
  export type AiAgentToolDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AiAgentTools to delete
     */
    where?: AiAgentToolWhereInput
    /**
     * Limit how many AiAgentTools to delete.
     */
    limit?: number
  }

  /**
   * AiAgentTool without action
   */
  export type AiAgentToolDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiAgentTool
     */
    select?: AiAgentToolSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiAgentTool
     */
    omit?: AiAgentToolOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiAgentToolInclude<ExtArgs> | null
  }


  /**
   * Model ScanRun
   */

  export type AggregateScanRun = {
    _count: ScanRunCountAggregateOutputType | null
    _avg: ScanRunAvgAggregateOutputType | null
    _sum: ScanRunSumAggregateOutputType | null
    _min: ScanRunMinAggregateOutputType | null
    _max: ScanRunMaxAggregateOutputType | null
  }

  export type ScanRunAvgAggregateOutputType = {
    currentRound: number | null
    tacticsTotal: number | null
    tacticsComplete: number | null
  }

  export type ScanRunSumAggregateOutputType = {
    currentRound: number | null
    tacticsTotal: number | null
    tacticsComplete: number | null
  }

  export type ScanRunMinAggregateOutputType = {
    id: string | null
    status: $Enums.ScanRunStatus | null
    currentRound: number | null
    tacticsTotal: number | null
    tacticsComplete: number | null
    createdAt: Date | null
    completedAt: Date | null
  }

  export type ScanRunMaxAggregateOutputType = {
    id: string | null
    status: $Enums.ScanRunStatus | null
    currentRound: number | null
    tacticsTotal: number | null
    tacticsComplete: number | null
    createdAt: Date | null
    completedAt: Date | null
  }

  export type ScanRunCountAggregateOutputType = {
    id: number
    scope: number
    status: number
    currentRound: number
    tacticsTotal: number
    tacticsComplete: number
    createdAt: number
    completedAt: number
    _all: number
  }


  export type ScanRunAvgAggregateInputType = {
    currentRound?: true
    tacticsTotal?: true
    tacticsComplete?: true
  }

  export type ScanRunSumAggregateInputType = {
    currentRound?: true
    tacticsTotal?: true
    tacticsComplete?: true
  }

  export type ScanRunMinAggregateInputType = {
    id?: true
    status?: true
    currentRound?: true
    tacticsTotal?: true
    tacticsComplete?: true
    createdAt?: true
    completedAt?: true
  }

  export type ScanRunMaxAggregateInputType = {
    id?: true
    status?: true
    currentRound?: true
    tacticsTotal?: true
    tacticsComplete?: true
    createdAt?: true
    completedAt?: true
  }

  export type ScanRunCountAggregateInputType = {
    id?: true
    scope?: true
    status?: true
    currentRound?: true
    tacticsTotal?: true
    tacticsComplete?: true
    createdAt?: true
    completedAt?: true
    _all?: true
  }

  export type ScanRunAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ScanRun to aggregate.
     */
    where?: ScanRunWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanRuns to fetch.
     */
    orderBy?: ScanRunOrderByWithRelationInput | ScanRunOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ScanRunWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanRuns from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanRuns.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ScanRuns
    **/
    _count?: true | ScanRunCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ScanRunAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ScanRunSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ScanRunMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ScanRunMaxAggregateInputType
  }

  export type GetScanRunAggregateType<T extends ScanRunAggregateArgs> = {
        [P in keyof T & keyof AggregateScanRun]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateScanRun[P]>
      : GetScalarType<T[P], AggregateScanRun[P]>
  }




  export type ScanRunGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ScanRunWhereInput
    orderBy?: ScanRunOrderByWithAggregationInput | ScanRunOrderByWithAggregationInput[]
    by: ScanRunScalarFieldEnum[] | ScanRunScalarFieldEnum
    having?: ScanRunScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ScanRunCountAggregateInputType | true
    _avg?: ScanRunAvgAggregateInputType
    _sum?: ScanRunSumAggregateInputType
    _min?: ScanRunMinAggregateInputType
    _max?: ScanRunMaxAggregateInputType
  }

  export type ScanRunGroupByOutputType = {
    id: string
    scope: JsonValue
    status: $Enums.ScanRunStatus
    currentRound: number
    tacticsTotal: number
    tacticsComplete: number
    createdAt: Date
    completedAt: Date | null
    _count: ScanRunCountAggregateOutputType | null
    _avg: ScanRunAvgAggregateOutputType | null
    _sum: ScanRunSumAggregateOutputType | null
    _min: ScanRunMinAggregateOutputType | null
    _max: ScanRunMaxAggregateOutputType | null
  }

  type GetScanRunGroupByPayload<T extends ScanRunGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ScanRunGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ScanRunGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ScanRunGroupByOutputType[P]>
            : GetScalarType<T[P], ScanRunGroupByOutputType[P]>
        }
      >
    >


  export type ScanRunSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    scope?: boolean
    status?: boolean
    currentRound?: boolean
    tacticsTotal?: boolean
    tacticsComplete?: boolean
    createdAt?: boolean
    completedAt?: boolean
    scanTactics?: boolean | ScanRun$scanTacticsArgs<ExtArgs>
    scanFindings?: boolean | ScanRun$scanFindingsArgs<ExtArgs>
    scanAuditEntries?: boolean | ScanRun$scanAuditEntriesArgs<ExtArgs>
    escalationRoutes?: boolean | ScanRun$escalationRoutesArgs<ExtArgs>
    _count?: boolean | ScanRunCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["scanRun"]>

  export type ScanRunSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    scope?: boolean
    status?: boolean
    currentRound?: boolean
    tacticsTotal?: boolean
    tacticsComplete?: boolean
    createdAt?: boolean
    completedAt?: boolean
  }, ExtArgs["result"]["scanRun"]>

  export type ScanRunSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    scope?: boolean
    status?: boolean
    currentRound?: boolean
    tacticsTotal?: boolean
    tacticsComplete?: boolean
    createdAt?: boolean
    completedAt?: boolean
  }, ExtArgs["result"]["scanRun"]>

  export type ScanRunSelectScalar = {
    id?: boolean
    scope?: boolean
    status?: boolean
    currentRound?: boolean
    tacticsTotal?: boolean
    tacticsComplete?: boolean
    createdAt?: boolean
    completedAt?: boolean
  }

  export type ScanRunOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "scope" | "status" | "currentRound" | "tacticsTotal" | "tacticsComplete" | "createdAt" | "completedAt", ExtArgs["result"]["scanRun"]>
  export type ScanRunInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    scanTactics?: boolean | ScanRun$scanTacticsArgs<ExtArgs>
    scanFindings?: boolean | ScanRun$scanFindingsArgs<ExtArgs>
    scanAuditEntries?: boolean | ScanRun$scanAuditEntriesArgs<ExtArgs>
    escalationRoutes?: boolean | ScanRun$escalationRoutesArgs<ExtArgs>
    _count?: boolean | ScanRunCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ScanRunIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type ScanRunIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $ScanRunPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ScanRun"
    objects: {
      scanTactics: Prisma.$ScanTacticPayload<ExtArgs>[]
      scanFindings: Prisma.$ScanFindingPayload<ExtArgs>[]
      scanAuditEntries: Prisma.$ScanAuditEntryPayload<ExtArgs>[]
      escalationRoutes: Prisma.$EscalationRoutePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      scope: Prisma.JsonValue
      status: $Enums.ScanRunStatus
      currentRound: number
      tacticsTotal: number
      tacticsComplete: number
      createdAt: Date
      completedAt: Date | null
    }, ExtArgs["result"]["scanRun"]>
    composites: {}
  }

  type ScanRunGetPayload<S extends boolean | null | undefined | ScanRunDefaultArgs> = $Result.GetResult<Prisma.$ScanRunPayload, S>

  type ScanRunCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ScanRunFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ScanRunCountAggregateInputType | true
    }

  export interface ScanRunDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ScanRun'], meta: { name: 'ScanRun' } }
    /**
     * Find zero or one ScanRun that matches the filter.
     * @param {ScanRunFindUniqueArgs} args - Arguments to find a ScanRun
     * @example
     * // Get one ScanRun
     * const scanRun = await prisma.scanRun.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ScanRunFindUniqueArgs>(args: SelectSubset<T, ScanRunFindUniqueArgs<ExtArgs>>): Prisma__ScanRunClient<$Result.GetResult<Prisma.$ScanRunPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ScanRun that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ScanRunFindUniqueOrThrowArgs} args - Arguments to find a ScanRun
     * @example
     * // Get one ScanRun
     * const scanRun = await prisma.scanRun.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ScanRunFindUniqueOrThrowArgs>(args: SelectSubset<T, ScanRunFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ScanRunClient<$Result.GetResult<Prisma.$ScanRunPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ScanRun that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanRunFindFirstArgs} args - Arguments to find a ScanRun
     * @example
     * // Get one ScanRun
     * const scanRun = await prisma.scanRun.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ScanRunFindFirstArgs>(args?: SelectSubset<T, ScanRunFindFirstArgs<ExtArgs>>): Prisma__ScanRunClient<$Result.GetResult<Prisma.$ScanRunPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ScanRun that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanRunFindFirstOrThrowArgs} args - Arguments to find a ScanRun
     * @example
     * // Get one ScanRun
     * const scanRun = await prisma.scanRun.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ScanRunFindFirstOrThrowArgs>(args?: SelectSubset<T, ScanRunFindFirstOrThrowArgs<ExtArgs>>): Prisma__ScanRunClient<$Result.GetResult<Prisma.$ScanRunPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ScanRuns that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanRunFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ScanRuns
     * const scanRuns = await prisma.scanRun.findMany()
     * 
     * // Get first 10 ScanRuns
     * const scanRuns = await prisma.scanRun.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const scanRunWithIdOnly = await prisma.scanRun.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ScanRunFindManyArgs>(args?: SelectSubset<T, ScanRunFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanRunPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ScanRun.
     * @param {ScanRunCreateArgs} args - Arguments to create a ScanRun.
     * @example
     * // Create one ScanRun
     * const ScanRun = await prisma.scanRun.create({
     *   data: {
     *     // ... data to create a ScanRun
     *   }
     * })
     * 
     */
    create<T extends ScanRunCreateArgs>(args: SelectSubset<T, ScanRunCreateArgs<ExtArgs>>): Prisma__ScanRunClient<$Result.GetResult<Prisma.$ScanRunPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ScanRuns.
     * @param {ScanRunCreateManyArgs} args - Arguments to create many ScanRuns.
     * @example
     * // Create many ScanRuns
     * const scanRun = await prisma.scanRun.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ScanRunCreateManyArgs>(args?: SelectSubset<T, ScanRunCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ScanRuns and returns the data saved in the database.
     * @param {ScanRunCreateManyAndReturnArgs} args - Arguments to create many ScanRuns.
     * @example
     * // Create many ScanRuns
     * const scanRun = await prisma.scanRun.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ScanRuns and only return the `id`
     * const scanRunWithIdOnly = await prisma.scanRun.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ScanRunCreateManyAndReturnArgs>(args?: SelectSubset<T, ScanRunCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanRunPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ScanRun.
     * @param {ScanRunDeleteArgs} args - Arguments to delete one ScanRun.
     * @example
     * // Delete one ScanRun
     * const ScanRun = await prisma.scanRun.delete({
     *   where: {
     *     // ... filter to delete one ScanRun
     *   }
     * })
     * 
     */
    delete<T extends ScanRunDeleteArgs>(args: SelectSubset<T, ScanRunDeleteArgs<ExtArgs>>): Prisma__ScanRunClient<$Result.GetResult<Prisma.$ScanRunPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ScanRun.
     * @param {ScanRunUpdateArgs} args - Arguments to update one ScanRun.
     * @example
     * // Update one ScanRun
     * const scanRun = await prisma.scanRun.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ScanRunUpdateArgs>(args: SelectSubset<T, ScanRunUpdateArgs<ExtArgs>>): Prisma__ScanRunClient<$Result.GetResult<Prisma.$ScanRunPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ScanRuns.
     * @param {ScanRunDeleteManyArgs} args - Arguments to filter ScanRuns to delete.
     * @example
     * // Delete a few ScanRuns
     * const { count } = await prisma.scanRun.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ScanRunDeleteManyArgs>(args?: SelectSubset<T, ScanRunDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ScanRuns.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanRunUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ScanRuns
     * const scanRun = await prisma.scanRun.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ScanRunUpdateManyArgs>(args: SelectSubset<T, ScanRunUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ScanRuns and returns the data updated in the database.
     * @param {ScanRunUpdateManyAndReturnArgs} args - Arguments to update many ScanRuns.
     * @example
     * // Update many ScanRuns
     * const scanRun = await prisma.scanRun.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ScanRuns and only return the `id`
     * const scanRunWithIdOnly = await prisma.scanRun.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ScanRunUpdateManyAndReturnArgs>(args: SelectSubset<T, ScanRunUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanRunPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ScanRun.
     * @param {ScanRunUpsertArgs} args - Arguments to update or create a ScanRun.
     * @example
     * // Update or create a ScanRun
     * const scanRun = await prisma.scanRun.upsert({
     *   create: {
     *     // ... data to create a ScanRun
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ScanRun we want to update
     *   }
     * })
     */
    upsert<T extends ScanRunUpsertArgs>(args: SelectSubset<T, ScanRunUpsertArgs<ExtArgs>>): Prisma__ScanRunClient<$Result.GetResult<Prisma.$ScanRunPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ScanRuns.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanRunCountArgs} args - Arguments to filter ScanRuns to count.
     * @example
     * // Count the number of ScanRuns
     * const count = await prisma.scanRun.count({
     *   where: {
     *     // ... the filter for the ScanRuns we want to count
     *   }
     * })
    **/
    count<T extends ScanRunCountArgs>(
      args?: Subset<T, ScanRunCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ScanRunCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ScanRun.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanRunAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ScanRunAggregateArgs>(args: Subset<T, ScanRunAggregateArgs>): Prisma.PrismaPromise<GetScanRunAggregateType<T>>

    /**
     * Group by ScanRun.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanRunGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ScanRunGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ScanRunGroupByArgs['orderBy'] }
        : { orderBy?: ScanRunGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ScanRunGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetScanRunGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ScanRun model
   */
  readonly fields: ScanRunFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ScanRun.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ScanRunClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    scanTactics<T extends ScanRun$scanTacticsArgs<ExtArgs> = {}>(args?: Subset<T, ScanRun$scanTacticsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanTacticPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    scanFindings<T extends ScanRun$scanFindingsArgs<ExtArgs> = {}>(args?: Subset<T, ScanRun$scanFindingsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanFindingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    scanAuditEntries<T extends ScanRun$scanAuditEntriesArgs<ExtArgs> = {}>(args?: Subset<T, ScanRun$scanAuditEntriesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanAuditEntryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    escalationRoutes<T extends ScanRun$escalationRoutesArgs<ExtArgs> = {}>(args?: Subset<T, ScanRun$escalationRoutesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EscalationRoutePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ScanRun model
   */
  interface ScanRunFieldRefs {
    readonly id: FieldRef<"ScanRun", 'String'>
    readonly scope: FieldRef<"ScanRun", 'Json'>
    readonly status: FieldRef<"ScanRun", 'ScanRunStatus'>
    readonly currentRound: FieldRef<"ScanRun", 'Int'>
    readonly tacticsTotal: FieldRef<"ScanRun", 'Int'>
    readonly tacticsComplete: FieldRef<"ScanRun", 'Int'>
    readonly createdAt: FieldRef<"ScanRun", 'DateTime'>
    readonly completedAt: FieldRef<"ScanRun", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ScanRun findUnique
   */
  export type ScanRunFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanRun
     */
    select?: ScanRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanRun
     */
    omit?: ScanRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanRunInclude<ExtArgs> | null
    /**
     * Filter, which ScanRun to fetch.
     */
    where: ScanRunWhereUniqueInput
  }

  /**
   * ScanRun findUniqueOrThrow
   */
  export type ScanRunFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanRun
     */
    select?: ScanRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanRun
     */
    omit?: ScanRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanRunInclude<ExtArgs> | null
    /**
     * Filter, which ScanRun to fetch.
     */
    where: ScanRunWhereUniqueInput
  }

  /**
   * ScanRun findFirst
   */
  export type ScanRunFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanRun
     */
    select?: ScanRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanRun
     */
    omit?: ScanRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanRunInclude<ExtArgs> | null
    /**
     * Filter, which ScanRun to fetch.
     */
    where?: ScanRunWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanRuns to fetch.
     */
    orderBy?: ScanRunOrderByWithRelationInput | ScanRunOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ScanRuns.
     */
    cursor?: ScanRunWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanRuns from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanRuns.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ScanRuns.
     */
    distinct?: ScanRunScalarFieldEnum | ScanRunScalarFieldEnum[]
  }

  /**
   * ScanRun findFirstOrThrow
   */
  export type ScanRunFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanRun
     */
    select?: ScanRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanRun
     */
    omit?: ScanRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanRunInclude<ExtArgs> | null
    /**
     * Filter, which ScanRun to fetch.
     */
    where?: ScanRunWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanRuns to fetch.
     */
    orderBy?: ScanRunOrderByWithRelationInput | ScanRunOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ScanRuns.
     */
    cursor?: ScanRunWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanRuns from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanRuns.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ScanRuns.
     */
    distinct?: ScanRunScalarFieldEnum | ScanRunScalarFieldEnum[]
  }

  /**
   * ScanRun findMany
   */
  export type ScanRunFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanRun
     */
    select?: ScanRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanRun
     */
    omit?: ScanRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanRunInclude<ExtArgs> | null
    /**
     * Filter, which ScanRuns to fetch.
     */
    where?: ScanRunWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanRuns to fetch.
     */
    orderBy?: ScanRunOrderByWithRelationInput | ScanRunOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ScanRuns.
     */
    cursor?: ScanRunWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanRuns from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanRuns.
     */
    skip?: number
    distinct?: ScanRunScalarFieldEnum | ScanRunScalarFieldEnum[]
  }

  /**
   * ScanRun create
   */
  export type ScanRunCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanRun
     */
    select?: ScanRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanRun
     */
    omit?: ScanRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanRunInclude<ExtArgs> | null
    /**
     * The data needed to create a ScanRun.
     */
    data: XOR<ScanRunCreateInput, ScanRunUncheckedCreateInput>
  }

  /**
   * ScanRun createMany
   */
  export type ScanRunCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ScanRuns.
     */
    data: ScanRunCreateManyInput | ScanRunCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ScanRun createManyAndReturn
   */
  export type ScanRunCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanRun
     */
    select?: ScanRunSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ScanRun
     */
    omit?: ScanRunOmit<ExtArgs> | null
    /**
     * The data used to create many ScanRuns.
     */
    data: ScanRunCreateManyInput | ScanRunCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ScanRun update
   */
  export type ScanRunUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanRun
     */
    select?: ScanRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanRun
     */
    omit?: ScanRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanRunInclude<ExtArgs> | null
    /**
     * The data needed to update a ScanRun.
     */
    data: XOR<ScanRunUpdateInput, ScanRunUncheckedUpdateInput>
    /**
     * Choose, which ScanRun to update.
     */
    where: ScanRunWhereUniqueInput
  }

  /**
   * ScanRun updateMany
   */
  export type ScanRunUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ScanRuns.
     */
    data: XOR<ScanRunUpdateManyMutationInput, ScanRunUncheckedUpdateManyInput>
    /**
     * Filter which ScanRuns to update
     */
    where?: ScanRunWhereInput
    /**
     * Limit how many ScanRuns to update.
     */
    limit?: number
  }

  /**
   * ScanRun updateManyAndReturn
   */
  export type ScanRunUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanRun
     */
    select?: ScanRunSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ScanRun
     */
    omit?: ScanRunOmit<ExtArgs> | null
    /**
     * The data used to update ScanRuns.
     */
    data: XOR<ScanRunUpdateManyMutationInput, ScanRunUncheckedUpdateManyInput>
    /**
     * Filter which ScanRuns to update
     */
    where?: ScanRunWhereInput
    /**
     * Limit how many ScanRuns to update.
     */
    limit?: number
  }

  /**
   * ScanRun upsert
   */
  export type ScanRunUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanRun
     */
    select?: ScanRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanRun
     */
    omit?: ScanRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanRunInclude<ExtArgs> | null
    /**
     * The filter to search for the ScanRun to update in case it exists.
     */
    where: ScanRunWhereUniqueInput
    /**
     * In case the ScanRun found by the `where` argument doesn't exist, create a new ScanRun with this data.
     */
    create: XOR<ScanRunCreateInput, ScanRunUncheckedCreateInput>
    /**
     * In case the ScanRun was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ScanRunUpdateInput, ScanRunUncheckedUpdateInput>
  }

  /**
   * ScanRun delete
   */
  export type ScanRunDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanRun
     */
    select?: ScanRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanRun
     */
    omit?: ScanRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanRunInclude<ExtArgs> | null
    /**
     * Filter which ScanRun to delete.
     */
    where: ScanRunWhereUniqueInput
  }

  /**
   * ScanRun deleteMany
   */
  export type ScanRunDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ScanRuns to delete
     */
    where?: ScanRunWhereInput
    /**
     * Limit how many ScanRuns to delete.
     */
    limit?: number
  }

  /**
   * ScanRun.scanTactics
   */
  export type ScanRun$scanTacticsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanTactic
     */
    select?: ScanTacticSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanTactic
     */
    omit?: ScanTacticOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanTacticInclude<ExtArgs> | null
    where?: ScanTacticWhereInput
    orderBy?: ScanTacticOrderByWithRelationInput | ScanTacticOrderByWithRelationInput[]
    cursor?: ScanTacticWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ScanTacticScalarFieldEnum | ScanTacticScalarFieldEnum[]
  }

  /**
   * ScanRun.scanFindings
   */
  export type ScanRun$scanFindingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanFinding
     */
    select?: ScanFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanFinding
     */
    omit?: ScanFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanFindingInclude<ExtArgs> | null
    where?: ScanFindingWhereInput
    orderBy?: ScanFindingOrderByWithRelationInput | ScanFindingOrderByWithRelationInput[]
    cursor?: ScanFindingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ScanFindingScalarFieldEnum | ScanFindingScalarFieldEnum[]
  }

  /**
   * ScanRun.scanAuditEntries
   */
  export type ScanRun$scanAuditEntriesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanAuditEntry
     */
    select?: ScanAuditEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanAuditEntry
     */
    omit?: ScanAuditEntryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanAuditEntryInclude<ExtArgs> | null
    where?: ScanAuditEntryWhereInput
    orderBy?: ScanAuditEntryOrderByWithRelationInput | ScanAuditEntryOrderByWithRelationInput[]
    cursor?: ScanAuditEntryWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ScanAuditEntryScalarFieldEnum | ScanAuditEntryScalarFieldEnum[]
  }

  /**
   * ScanRun.escalationRoutes
   */
  export type ScanRun$escalationRoutesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRoute
     */
    select?: EscalationRouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRoute
     */
    omit?: EscalationRouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteInclude<ExtArgs> | null
    where?: EscalationRouteWhereInput
    orderBy?: EscalationRouteOrderByWithRelationInput | EscalationRouteOrderByWithRelationInput[]
    cursor?: EscalationRouteWhereUniqueInput
    take?: number
    skip?: number
    distinct?: EscalationRouteScalarFieldEnum | EscalationRouteScalarFieldEnum[]
  }

  /**
   * ScanRun without action
   */
  export type ScanRunDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanRun
     */
    select?: ScanRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanRun
     */
    omit?: ScanRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanRunInclude<ExtArgs> | null
  }


  /**
   * Model ScanTactic
   */

  export type AggregateScanTactic = {
    _count: ScanTacticCountAggregateOutputType | null
    _avg: ScanTacticAvgAggregateOutputType | null
    _sum: ScanTacticSumAggregateOutputType | null
    _min: ScanTacticMinAggregateOutputType | null
    _max: ScanTacticMaxAggregateOutputType | null
  }

  export type ScanTacticAvgAggregateOutputType = {
    port: number | null
    riskScore: number | null
    depth: number | null
  }

  export type ScanTacticSumAggregateOutputType = {
    port: number | null
    riskScore: number | null
    depth: number | null
  }

  export type ScanTacticMinAggregateOutputType = {
    id: string | null
    scanRunId: string | null
    target: string | null
    layer: string | null
    service: string | null
    port: number | null
    riskScore: number | null
    status: $Enums.ScanTacticStatus | null
    parentTacticId: string | null
    depth: number | null
    createdAt: Date | null
  }

  export type ScanTacticMaxAggregateOutputType = {
    id: string | null
    scanRunId: string | null
    target: string | null
    layer: string | null
    service: string | null
    port: number | null
    riskScore: number | null
    status: $Enums.ScanTacticStatus | null
    parentTacticId: string | null
    depth: number | null
    createdAt: Date | null
  }

  export type ScanTacticCountAggregateOutputType = {
    id: number
    scanRunId: number
    target: number
    layer: number
    service: number
    port: number
    riskScore: number
    status: number
    parentTacticId: number
    depth: number
    createdAt: number
    _all: number
  }


  export type ScanTacticAvgAggregateInputType = {
    port?: true
    riskScore?: true
    depth?: true
  }

  export type ScanTacticSumAggregateInputType = {
    port?: true
    riskScore?: true
    depth?: true
  }

  export type ScanTacticMinAggregateInputType = {
    id?: true
    scanRunId?: true
    target?: true
    layer?: true
    service?: true
    port?: true
    riskScore?: true
    status?: true
    parentTacticId?: true
    depth?: true
    createdAt?: true
  }

  export type ScanTacticMaxAggregateInputType = {
    id?: true
    scanRunId?: true
    target?: true
    layer?: true
    service?: true
    port?: true
    riskScore?: true
    status?: true
    parentTacticId?: true
    depth?: true
    createdAt?: true
  }

  export type ScanTacticCountAggregateInputType = {
    id?: true
    scanRunId?: true
    target?: true
    layer?: true
    service?: true
    port?: true
    riskScore?: true
    status?: true
    parentTacticId?: true
    depth?: true
    createdAt?: true
    _all?: true
  }

  export type ScanTacticAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ScanTactic to aggregate.
     */
    where?: ScanTacticWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanTactics to fetch.
     */
    orderBy?: ScanTacticOrderByWithRelationInput | ScanTacticOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ScanTacticWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanTactics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanTactics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ScanTactics
    **/
    _count?: true | ScanTacticCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ScanTacticAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ScanTacticSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ScanTacticMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ScanTacticMaxAggregateInputType
  }

  export type GetScanTacticAggregateType<T extends ScanTacticAggregateArgs> = {
        [P in keyof T & keyof AggregateScanTactic]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateScanTactic[P]>
      : GetScalarType<T[P], AggregateScanTactic[P]>
  }




  export type ScanTacticGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ScanTacticWhereInput
    orderBy?: ScanTacticOrderByWithAggregationInput | ScanTacticOrderByWithAggregationInput[]
    by: ScanTacticScalarFieldEnum[] | ScanTacticScalarFieldEnum
    having?: ScanTacticScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ScanTacticCountAggregateInputType | true
    _avg?: ScanTacticAvgAggregateInputType
    _sum?: ScanTacticSumAggregateInputType
    _min?: ScanTacticMinAggregateInputType
    _max?: ScanTacticMaxAggregateInputType
  }

  export type ScanTacticGroupByOutputType = {
    id: string
    scanRunId: string
    target: string
    layer: string
    service: string | null
    port: number | null
    riskScore: number
    status: $Enums.ScanTacticStatus
    parentTacticId: string | null
    depth: number
    createdAt: Date
    _count: ScanTacticCountAggregateOutputType | null
    _avg: ScanTacticAvgAggregateOutputType | null
    _sum: ScanTacticSumAggregateOutputType | null
    _min: ScanTacticMinAggregateOutputType | null
    _max: ScanTacticMaxAggregateOutputType | null
  }

  type GetScanTacticGroupByPayload<T extends ScanTacticGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ScanTacticGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ScanTacticGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ScanTacticGroupByOutputType[P]>
            : GetScalarType<T[P], ScanTacticGroupByOutputType[P]>
        }
      >
    >


  export type ScanTacticSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    scanRunId?: boolean
    target?: boolean
    layer?: boolean
    service?: boolean
    port?: boolean
    riskScore?: boolean
    status?: boolean
    parentTacticId?: boolean
    depth?: boolean
    createdAt?: boolean
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
    parentTactic?: boolean | ScanTactic$parentTacticArgs<ExtArgs>
    childTactics?: boolean | ScanTactic$childTacticsArgs<ExtArgs>
    scanFindings?: boolean | ScanTactic$scanFindingsArgs<ExtArgs>
    _count?: boolean | ScanTacticCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["scanTactic"]>

  export type ScanTacticSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    scanRunId?: boolean
    target?: boolean
    layer?: boolean
    service?: boolean
    port?: boolean
    riskScore?: boolean
    status?: boolean
    parentTacticId?: boolean
    depth?: boolean
    createdAt?: boolean
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
    parentTactic?: boolean | ScanTactic$parentTacticArgs<ExtArgs>
  }, ExtArgs["result"]["scanTactic"]>

  export type ScanTacticSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    scanRunId?: boolean
    target?: boolean
    layer?: boolean
    service?: boolean
    port?: boolean
    riskScore?: boolean
    status?: boolean
    parentTacticId?: boolean
    depth?: boolean
    createdAt?: boolean
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
    parentTactic?: boolean | ScanTactic$parentTacticArgs<ExtArgs>
  }, ExtArgs["result"]["scanTactic"]>

  export type ScanTacticSelectScalar = {
    id?: boolean
    scanRunId?: boolean
    target?: boolean
    layer?: boolean
    service?: boolean
    port?: boolean
    riskScore?: boolean
    status?: boolean
    parentTacticId?: boolean
    depth?: boolean
    createdAt?: boolean
  }

  export type ScanTacticOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "scanRunId" | "target" | "layer" | "service" | "port" | "riskScore" | "status" | "parentTacticId" | "depth" | "createdAt", ExtArgs["result"]["scanTactic"]>
  export type ScanTacticInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
    parentTactic?: boolean | ScanTactic$parentTacticArgs<ExtArgs>
    childTactics?: boolean | ScanTactic$childTacticsArgs<ExtArgs>
    scanFindings?: boolean | ScanTactic$scanFindingsArgs<ExtArgs>
    _count?: boolean | ScanTacticCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ScanTacticIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
    parentTactic?: boolean | ScanTactic$parentTacticArgs<ExtArgs>
  }
  export type ScanTacticIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
    parentTactic?: boolean | ScanTactic$parentTacticArgs<ExtArgs>
  }

  export type $ScanTacticPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ScanTactic"
    objects: {
      scanRun: Prisma.$ScanRunPayload<ExtArgs>
      parentTactic: Prisma.$ScanTacticPayload<ExtArgs> | null
      childTactics: Prisma.$ScanTacticPayload<ExtArgs>[]
      scanFindings: Prisma.$ScanFindingPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      scanRunId: string
      target: string
      layer: string
      service: string | null
      port: number | null
      riskScore: number
      status: $Enums.ScanTacticStatus
      parentTacticId: string | null
      depth: number
      createdAt: Date
    }, ExtArgs["result"]["scanTactic"]>
    composites: {}
  }

  type ScanTacticGetPayload<S extends boolean | null | undefined | ScanTacticDefaultArgs> = $Result.GetResult<Prisma.$ScanTacticPayload, S>

  type ScanTacticCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ScanTacticFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ScanTacticCountAggregateInputType | true
    }

  export interface ScanTacticDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ScanTactic'], meta: { name: 'ScanTactic' } }
    /**
     * Find zero or one ScanTactic that matches the filter.
     * @param {ScanTacticFindUniqueArgs} args - Arguments to find a ScanTactic
     * @example
     * // Get one ScanTactic
     * const scanTactic = await prisma.scanTactic.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ScanTacticFindUniqueArgs>(args: SelectSubset<T, ScanTacticFindUniqueArgs<ExtArgs>>): Prisma__ScanTacticClient<$Result.GetResult<Prisma.$ScanTacticPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ScanTactic that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ScanTacticFindUniqueOrThrowArgs} args - Arguments to find a ScanTactic
     * @example
     * // Get one ScanTactic
     * const scanTactic = await prisma.scanTactic.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ScanTacticFindUniqueOrThrowArgs>(args: SelectSubset<T, ScanTacticFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ScanTacticClient<$Result.GetResult<Prisma.$ScanTacticPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ScanTactic that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanTacticFindFirstArgs} args - Arguments to find a ScanTactic
     * @example
     * // Get one ScanTactic
     * const scanTactic = await prisma.scanTactic.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ScanTacticFindFirstArgs>(args?: SelectSubset<T, ScanTacticFindFirstArgs<ExtArgs>>): Prisma__ScanTacticClient<$Result.GetResult<Prisma.$ScanTacticPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ScanTactic that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanTacticFindFirstOrThrowArgs} args - Arguments to find a ScanTactic
     * @example
     * // Get one ScanTactic
     * const scanTactic = await prisma.scanTactic.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ScanTacticFindFirstOrThrowArgs>(args?: SelectSubset<T, ScanTacticFindFirstOrThrowArgs<ExtArgs>>): Prisma__ScanTacticClient<$Result.GetResult<Prisma.$ScanTacticPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ScanTactics that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanTacticFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ScanTactics
     * const scanTactics = await prisma.scanTactic.findMany()
     * 
     * // Get first 10 ScanTactics
     * const scanTactics = await prisma.scanTactic.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const scanTacticWithIdOnly = await prisma.scanTactic.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ScanTacticFindManyArgs>(args?: SelectSubset<T, ScanTacticFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanTacticPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ScanTactic.
     * @param {ScanTacticCreateArgs} args - Arguments to create a ScanTactic.
     * @example
     * // Create one ScanTactic
     * const ScanTactic = await prisma.scanTactic.create({
     *   data: {
     *     // ... data to create a ScanTactic
     *   }
     * })
     * 
     */
    create<T extends ScanTacticCreateArgs>(args: SelectSubset<T, ScanTacticCreateArgs<ExtArgs>>): Prisma__ScanTacticClient<$Result.GetResult<Prisma.$ScanTacticPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ScanTactics.
     * @param {ScanTacticCreateManyArgs} args - Arguments to create many ScanTactics.
     * @example
     * // Create many ScanTactics
     * const scanTactic = await prisma.scanTactic.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ScanTacticCreateManyArgs>(args?: SelectSubset<T, ScanTacticCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ScanTactics and returns the data saved in the database.
     * @param {ScanTacticCreateManyAndReturnArgs} args - Arguments to create many ScanTactics.
     * @example
     * // Create many ScanTactics
     * const scanTactic = await prisma.scanTactic.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ScanTactics and only return the `id`
     * const scanTacticWithIdOnly = await prisma.scanTactic.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ScanTacticCreateManyAndReturnArgs>(args?: SelectSubset<T, ScanTacticCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanTacticPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ScanTactic.
     * @param {ScanTacticDeleteArgs} args - Arguments to delete one ScanTactic.
     * @example
     * // Delete one ScanTactic
     * const ScanTactic = await prisma.scanTactic.delete({
     *   where: {
     *     // ... filter to delete one ScanTactic
     *   }
     * })
     * 
     */
    delete<T extends ScanTacticDeleteArgs>(args: SelectSubset<T, ScanTacticDeleteArgs<ExtArgs>>): Prisma__ScanTacticClient<$Result.GetResult<Prisma.$ScanTacticPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ScanTactic.
     * @param {ScanTacticUpdateArgs} args - Arguments to update one ScanTactic.
     * @example
     * // Update one ScanTactic
     * const scanTactic = await prisma.scanTactic.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ScanTacticUpdateArgs>(args: SelectSubset<T, ScanTacticUpdateArgs<ExtArgs>>): Prisma__ScanTacticClient<$Result.GetResult<Prisma.$ScanTacticPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ScanTactics.
     * @param {ScanTacticDeleteManyArgs} args - Arguments to filter ScanTactics to delete.
     * @example
     * // Delete a few ScanTactics
     * const { count } = await prisma.scanTactic.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ScanTacticDeleteManyArgs>(args?: SelectSubset<T, ScanTacticDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ScanTactics.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanTacticUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ScanTactics
     * const scanTactic = await prisma.scanTactic.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ScanTacticUpdateManyArgs>(args: SelectSubset<T, ScanTacticUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ScanTactics and returns the data updated in the database.
     * @param {ScanTacticUpdateManyAndReturnArgs} args - Arguments to update many ScanTactics.
     * @example
     * // Update many ScanTactics
     * const scanTactic = await prisma.scanTactic.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ScanTactics and only return the `id`
     * const scanTacticWithIdOnly = await prisma.scanTactic.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ScanTacticUpdateManyAndReturnArgs>(args: SelectSubset<T, ScanTacticUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanTacticPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ScanTactic.
     * @param {ScanTacticUpsertArgs} args - Arguments to update or create a ScanTactic.
     * @example
     * // Update or create a ScanTactic
     * const scanTactic = await prisma.scanTactic.upsert({
     *   create: {
     *     // ... data to create a ScanTactic
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ScanTactic we want to update
     *   }
     * })
     */
    upsert<T extends ScanTacticUpsertArgs>(args: SelectSubset<T, ScanTacticUpsertArgs<ExtArgs>>): Prisma__ScanTacticClient<$Result.GetResult<Prisma.$ScanTacticPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ScanTactics.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanTacticCountArgs} args - Arguments to filter ScanTactics to count.
     * @example
     * // Count the number of ScanTactics
     * const count = await prisma.scanTactic.count({
     *   where: {
     *     // ... the filter for the ScanTactics we want to count
     *   }
     * })
    **/
    count<T extends ScanTacticCountArgs>(
      args?: Subset<T, ScanTacticCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ScanTacticCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ScanTactic.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanTacticAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ScanTacticAggregateArgs>(args: Subset<T, ScanTacticAggregateArgs>): Prisma.PrismaPromise<GetScanTacticAggregateType<T>>

    /**
     * Group by ScanTactic.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanTacticGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ScanTacticGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ScanTacticGroupByArgs['orderBy'] }
        : { orderBy?: ScanTacticGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ScanTacticGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetScanTacticGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ScanTactic model
   */
  readonly fields: ScanTacticFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ScanTactic.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ScanTacticClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    scanRun<T extends ScanRunDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ScanRunDefaultArgs<ExtArgs>>): Prisma__ScanRunClient<$Result.GetResult<Prisma.$ScanRunPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    parentTactic<T extends ScanTactic$parentTacticArgs<ExtArgs> = {}>(args?: Subset<T, ScanTactic$parentTacticArgs<ExtArgs>>): Prisma__ScanTacticClient<$Result.GetResult<Prisma.$ScanTacticPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    childTactics<T extends ScanTactic$childTacticsArgs<ExtArgs> = {}>(args?: Subset<T, ScanTactic$childTacticsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanTacticPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    scanFindings<T extends ScanTactic$scanFindingsArgs<ExtArgs> = {}>(args?: Subset<T, ScanTactic$scanFindingsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanFindingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ScanTactic model
   */
  interface ScanTacticFieldRefs {
    readonly id: FieldRef<"ScanTactic", 'String'>
    readonly scanRunId: FieldRef<"ScanTactic", 'String'>
    readonly target: FieldRef<"ScanTactic", 'String'>
    readonly layer: FieldRef<"ScanTactic", 'String'>
    readonly service: FieldRef<"ScanTactic", 'String'>
    readonly port: FieldRef<"ScanTactic", 'Int'>
    readonly riskScore: FieldRef<"ScanTactic", 'Float'>
    readonly status: FieldRef<"ScanTactic", 'ScanTacticStatus'>
    readonly parentTacticId: FieldRef<"ScanTactic", 'String'>
    readonly depth: FieldRef<"ScanTactic", 'Int'>
    readonly createdAt: FieldRef<"ScanTactic", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ScanTactic findUnique
   */
  export type ScanTacticFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanTactic
     */
    select?: ScanTacticSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanTactic
     */
    omit?: ScanTacticOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanTacticInclude<ExtArgs> | null
    /**
     * Filter, which ScanTactic to fetch.
     */
    where: ScanTacticWhereUniqueInput
  }

  /**
   * ScanTactic findUniqueOrThrow
   */
  export type ScanTacticFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanTactic
     */
    select?: ScanTacticSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanTactic
     */
    omit?: ScanTacticOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanTacticInclude<ExtArgs> | null
    /**
     * Filter, which ScanTactic to fetch.
     */
    where: ScanTacticWhereUniqueInput
  }

  /**
   * ScanTactic findFirst
   */
  export type ScanTacticFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanTactic
     */
    select?: ScanTacticSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanTactic
     */
    omit?: ScanTacticOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanTacticInclude<ExtArgs> | null
    /**
     * Filter, which ScanTactic to fetch.
     */
    where?: ScanTacticWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanTactics to fetch.
     */
    orderBy?: ScanTacticOrderByWithRelationInput | ScanTacticOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ScanTactics.
     */
    cursor?: ScanTacticWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanTactics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanTactics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ScanTactics.
     */
    distinct?: ScanTacticScalarFieldEnum | ScanTacticScalarFieldEnum[]
  }

  /**
   * ScanTactic findFirstOrThrow
   */
  export type ScanTacticFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanTactic
     */
    select?: ScanTacticSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanTactic
     */
    omit?: ScanTacticOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanTacticInclude<ExtArgs> | null
    /**
     * Filter, which ScanTactic to fetch.
     */
    where?: ScanTacticWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanTactics to fetch.
     */
    orderBy?: ScanTacticOrderByWithRelationInput | ScanTacticOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ScanTactics.
     */
    cursor?: ScanTacticWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanTactics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanTactics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ScanTactics.
     */
    distinct?: ScanTacticScalarFieldEnum | ScanTacticScalarFieldEnum[]
  }

  /**
   * ScanTactic findMany
   */
  export type ScanTacticFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanTactic
     */
    select?: ScanTacticSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanTactic
     */
    omit?: ScanTacticOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanTacticInclude<ExtArgs> | null
    /**
     * Filter, which ScanTactics to fetch.
     */
    where?: ScanTacticWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanTactics to fetch.
     */
    orderBy?: ScanTacticOrderByWithRelationInput | ScanTacticOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ScanTactics.
     */
    cursor?: ScanTacticWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanTactics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanTactics.
     */
    skip?: number
    distinct?: ScanTacticScalarFieldEnum | ScanTacticScalarFieldEnum[]
  }

  /**
   * ScanTactic create
   */
  export type ScanTacticCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanTactic
     */
    select?: ScanTacticSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanTactic
     */
    omit?: ScanTacticOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanTacticInclude<ExtArgs> | null
    /**
     * The data needed to create a ScanTactic.
     */
    data: XOR<ScanTacticCreateInput, ScanTacticUncheckedCreateInput>
  }

  /**
   * ScanTactic createMany
   */
  export type ScanTacticCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ScanTactics.
     */
    data: ScanTacticCreateManyInput | ScanTacticCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ScanTactic createManyAndReturn
   */
  export type ScanTacticCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanTactic
     */
    select?: ScanTacticSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ScanTactic
     */
    omit?: ScanTacticOmit<ExtArgs> | null
    /**
     * The data used to create many ScanTactics.
     */
    data: ScanTacticCreateManyInput | ScanTacticCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanTacticIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ScanTactic update
   */
  export type ScanTacticUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanTactic
     */
    select?: ScanTacticSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanTactic
     */
    omit?: ScanTacticOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanTacticInclude<ExtArgs> | null
    /**
     * The data needed to update a ScanTactic.
     */
    data: XOR<ScanTacticUpdateInput, ScanTacticUncheckedUpdateInput>
    /**
     * Choose, which ScanTactic to update.
     */
    where: ScanTacticWhereUniqueInput
  }

  /**
   * ScanTactic updateMany
   */
  export type ScanTacticUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ScanTactics.
     */
    data: XOR<ScanTacticUpdateManyMutationInput, ScanTacticUncheckedUpdateManyInput>
    /**
     * Filter which ScanTactics to update
     */
    where?: ScanTacticWhereInput
    /**
     * Limit how many ScanTactics to update.
     */
    limit?: number
  }

  /**
   * ScanTactic updateManyAndReturn
   */
  export type ScanTacticUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanTactic
     */
    select?: ScanTacticSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ScanTactic
     */
    omit?: ScanTacticOmit<ExtArgs> | null
    /**
     * The data used to update ScanTactics.
     */
    data: XOR<ScanTacticUpdateManyMutationInput, ScanTacticUncheckedUpdateManyInput>
    /**
     * Filter which ScanTactics to update
     */
    where?: ScanTacticWhereInput
    /**
     * Limit how many ScanTactics to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanTacticIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ScanTactic upsert
   */
  export type ScanTacticUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanTactic
     */
    select?: ScanTacticSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanTactic
     */
    omit?: ScanTacticOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanTacticInclude<ExtArgs> | null
    /**
     * The filter to search for the ScanTactic to update in case it exists.
     */
    where: ScanTacticWhereUniqueInput
    /**
     * In case the ScanTactic found by the `where` argument doesn't exist, create a new ScanTactic with this data.
     */
    create: XOR<ScanTacticCreateInput, ScanTacticUncheckedCreateInput>
    /**
     * In case the ScanTactic was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ScanTacticUpdateInput, ScanTacticUncheckedUpdateInput>
  }

  /**
   * ScanTactic delete
   */
  export type ScanTacticDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanTactic
     */
    select?: ScanTacticSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanTactic
     */
    omit?: ScanTacticOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanTacticInclude<ExtArgs> | null
    /**
     * Filter which ScanTactic to delete.
     */
    where: ScanTacticWhereUniqueInput
  }

  /**
   * ScanTactic deleteMany
   */
  export type ScanTacticDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ScanTactics to delete
     */
    where?: ScanTacticWhereInput
    /**
     * Limit how many ScanTactics to delete.
     */
    limit?: number
  }

  /**
   * ScanTactic.parentTactic
   */
  export type ScanTactic$parentTacticArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanTactic
     */
    select?: ScanTacticSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanTactic
     */
    omit?: ScanTacticOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanTacticInclude<ExtArgs> | null
    where?: ScanTacticWhereInput
  }

  /**
   * ScanTactic.childTactics
   */
  export type ScanTactic$childTacticsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanTactic
     */
    select?: ScanTacticSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanTactic
     */
    omit?: ScanTacticOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanTacticInclude<ExtArgs> | null
    where?: ScanTacticWhereInput
    orderBy?: ScanTacticOrderByWithRelationInput | ScanTacticOrderByWithRelationInput[]
    cursor?: ScanTacticWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ScanTacticScalarFieldEnum | ScanTacticScalarFieldEnum[]
  }

  /**
   * ScanTactic.scanFindings
   */
  export type ScanTactic$scanFindingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanFinding
     */
    select?: ScanFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanFinding
     */
    omit?: ScanFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanFindingInclude<ExtArgs> | null
    where?: ScanFindingWhereInput
    orderBy?: ScanFindingOrderByWithRelationInput | ScanFindingOrderByWithRelationInput[]
    cursor?: ScanFindingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ScanFindingScalarFieldEnum | ScanFindingScalarFieldEnum[]
  }

  /**
   * ScanTactic without action
   */
  export type ScanTacticDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanTactic
     */
    select?: ScanTacticSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanTactic
     */
    omit?: ScanTacticOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanTacticInclude<ExtArgs> | null
  }


  /**
   * Model ScanFinding
   */

  export type AggregateScanFinding = {
    _count: ScanFindingCountAggregateOutputType | null
    _avg: ScanFindingAvgAggregateOutputType | null
    _sum: ScanFindingSumAggregateOutputType | null
    _min: ScanFindingMinAggregateOutputType | null
    _max: ScanFindingMaxAggregateOutputType | null
  }

  export type ScanFindingAvgAggregateOutputType = {
    confidence: number | null
  }

  export type ScanFindingSumAggregateOutputType = {
    confidence: number | null
  }

  export type ScanFindingMinAggregateOutputType = {
    id: string | null
    scanRunId: string | null
    scanTacticId: string | null
    agentId: string | null
    severity: string | null
    confidence: number | null
    title: string | null
    description: string | null
    evidence: string | null
    technique: string | null
    reproduceCommand: string | null
    validated: boolean | null
    validationStatus: string | null
    confidenceReason: string | null
    createdAt: Date | null
  }

  export type ScanFindingMaxAggregateOutputType = {
    id: string | null
    scanRunId: string | null
    scanTacticId: string | null
    agentId: string | null
    severity: string | null
    confidence: number | null
    title: string | null
    description: string | null
    evidence: string | null
    technique: string | null
    reproduceCommand: string | null
    validated: boolean | null
    validationStatus: string | null
    confidenceReason: string | null
    createdAt: Date | null
  }

  export type ScanFindingCountAggregateOutputType = {
    id: number
    scanRunId: number
    scanTacticId: number
    agentId: number
    severity: number
    confidence: number
    title: number
    description: number
    evidence: number
    technique: number
    reproduceCommand: number
    validated: number
    validationStatus: number
    evidenceRefs: number
    sourceToolRuns: number
    confidenceReason: number
    createdAt: number
    _all: number
  }


  export type ScanFindingAvgAggregateInputType = {
    confidence?: true
  }

  export type ScanFindingSumAggregateInputType = {
    confidence?: true
  }

  export type ScanFindingMinAggregateInputType = {
    id?: true
    scanRunId?: true
    scanTacticId?: true
    agentId?: true
    severity?: true
    confidence?: true
    title?: true
    description?: true
    evidence?: true
    technique?: true
    reproduceCommand?: true
    validated?: true
    validationStatus?: true
    confidenceReason?: true
    createdAt?: true
  }

  export type ScanFindingMaxAggregateInputType = {
    id?: true
    scanRunId?: true
    scanTacticId?: true
    agentId?: true
    severity?: true
    confidence?: true
    title?: true
    description?: true
    evidence?: true
    technique?: true
    reproduceCommand?: true
    validated?: true
    validationStatus?: true
    confidenceReason?: true
    createdAt?: true
  }

  export type ScanFindingCountAggregateInputType = {
    id?: true
    scanRunId?: true
    scanTacticId?: true
    agentId?: true
    severity?: true
    confidence?: true
    title?: true
    description?: true
    evidence?: true
    technique?: true
    reproduceCommand?: true
    validated?: true
    validationStatus?: true
    evidenceRefs?: true
    sourceToolRuns?: true
    confidenceReason?: true
    createdAt?: true
    _all?: true
  }

  export type ScanFindingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ScanFinding to aggregate.
     */
    where?: ScanFindingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanFindings to fetch.
     */
    orderBy?: ScanFindingOrderByWithRelationInput | ScanFindingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ScanFindingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanFindings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanFindings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ScanFindings
    **/
    _count?: true | ScanFindingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ScanFindingAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ScanFindingSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ScanFindingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ScanFindingMaxAggregateInputType
  }

  export type GetScanFindingAggregateType<T extends ScanFindingAggregateArgs> = {
        [P in keyof T & keyof AggregateScanFinding]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateScanFinding[P]>
      : GetScalarType<T[P], AggregateScanFinding[P]>
  }




  export type ScanFindingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ScanFindingWhereInput
    orderBy?: ScanFindingOrderByWithAggregationInput | ScanFindingOrderByWithAggregationInput[]
    by: ScanFindingScalarFieldEnum[] | ScanFindingScalarFieldEnum
    having?: ScanFindingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ScanFindingCountAggregateInputType | true
    _avg?: ScanFindingAvgAggregateInputType
    _sum?: ScanFindingSumAggregateInputType
    _min?: ScanFindingMinAggregateInputType
    _max?: ScanFindingMaxAggregateInputType
  }

  export type ScanFindingGroupByOutputType = {
    id: string
    scanRunId: string
    scanTacticId: string
    agentId: string
    severity: string
    confidence: number
    title: string
    description: string
    evidence: string
    technique: string
    reproduceCommand: string | null
    validated: boolean
    validationStatus: string | null
    evidenceRefs: JsonValue | null
    sourceToolRuns: JsonValue | null
    confidenceReason: string | null
    createdAt: Date
    _count: ScanFindingCountAggregateOutputType | null
    _avg: ScanFindingAvgAggregateOutputType | null
    _sum: ScanFindingSumAggregateOutputType | null
    _min: ScanFindingMinAggregateOutputType | null
    _max: ScanFindingMaxAggregateOutputType | null
  }

  type GetScanFindingGroupByPayload<T extends ScanFindingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ScanFindingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ScanFindingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ScanFindingGroupByOutputType[P]>
            : GetScalarType<T[P], ScanFindingGroupByOutputType[P]>
        }
      >
    >


  export type ScanFindingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    scanRunId?: boolean
    scanTacticId?: boolean
    agentId?: boolean
    severity?: boolean
    confidence?: boolean
    title?: boolean
    description?: boolean
    evidence?: boolean
    technique?: boolean
    reproduceCommand?: boolean
    validated?: boolean
    validationStatus?: boolean
    evidenceRefs?: boolean
    sourceToolRuns?: boolean
    confidenceReason?: boolean
    createdAt?: boolean
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
    scanTactic?: boolean | ScanTacticDefaultArgs<ExtArgs>
    routeFindings?: boolean | ScanFinding$routeFindingsArgs<ExtArgs>
    _count?: boolean | ScanFindingCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["scanFinding"]>

  export type ScanFindingSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    scanRunId?: boolean
    scanTacticId?: boolean
    agentId?: boolean
    severity?: boolean
    confidence?: boolean
    title?: boolean
    description?: boolean
    evidence?: boolean
    technique?: boolean
    reproduceCommand?: boolean
    validated?: boolean
    validationStatus?: boolean
    evidenceRefs?: boolean
    sourceToolRuns?: boolean
    confidenceReason?: boolean
    createdAt?: boolean
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
    scanTactic?: boolean | ScanTacticDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["scanFinding"]>

  export type ScanFindingSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    scanRunId?: boolean
    scanTacticId?: boolean
    agentId?: boolean
    severity?: boolean
    confidence?: boolean
    title?: boolean
    description?: boolean
    evidence?: boolean
    technique?: boolean
    reproduceCommand?: boolean
    validated?: boolean
    validationStatus?: boolean
    evidenceRefs?: boolean
    sourceToolRuns?: boolean
    confidenceReason?: boolean
    createdAt?: boolean
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
    scanTactic?: boolean | ScanTacticDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["scanFinding"]>

  export type ScanFindingSelectScalar = {
    id?: boolean
    scanRunId?: boolean
    scanTacticId?: boolean
    agentId?: boolean
    severity?: boolean
    confidence?: boolean
    title?: boolean
    description?: boolean
    evidence?: boolean
    technique?: boolean
    reproduceCommand?: boolean
    validated?: boolean
    validationStatus?: boolean
    evidenceRefs?: boolean
    sourceToolRuns?: boolean
    confidenceReason?: boolean
    createdAt?: boolean
  }

  export type ScanFindingOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "scanRunId" | "scanTacticId" | "agentId" | "severity" | "confidence" | "title" | "description" | "evidence" | "technique" | "reproduceCommand" | "validated" | "validationStatus" | "evidenceRefs" | "sourceToolRuns" | "confidenceReason" | "createdAt", ExtArgs["result"]["scanFinding"]>
  export type ScanFindingInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
    scanTactic?: boolean | ScanTacticDefaultArgs<ExtArgs>
    routeFindings?: boolean | ScanFinding$routeFindingsArgs<ExtArgs>
    _count?: boolean | ScanFindingCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ScanFindingIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
    scanTactic?: boolean | ScanTacticDefaultArgs<ExtArgs>
  }
  export type ScanFindingIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
    scanTactic?: boolean | ScanTacticDefaultArgs<ExtArgs>
  }

  export type $ScanFindingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ScanFinding"
    objects: {
      scanRun: Prisma.$ScanRunPayload<ExtArgs>
      scanTactic: Prisma.$ScanTacticPayload<ExtArgs>
      routeFindings: Prisma.$EscalationRouteFindingPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      scanRunId: string
      scanTacticId: string
      agentId: string
      severity: string
      confidence: number
      title: string
      description: string
      evidence: string
      technique: string
      reproduceCommand: string | null
      validated: boolean
      validationStatus: string | null
      evidenceRefs: Prisma.JsonValue | null
      sourceToolRuns: Prisma.JsonValue | null
      confidenceReason: string | null
      createdAt: Date
    }, ExtArgs["result"]["scanFinding"]>
    composites: {}
  }

  type ScanFindingGetPayload<S extends boolean | null | undefined | ScanFindingDefaultArgs> = $Result.GetResult<Prisma.$ScanFindingPayload, S>

  type ScanFindingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ScanFindingFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ScanFindingCountAggregateInputType | true
    }

  export interface ScanFindingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ScanFinding'], meta: { name: 'ScanFinding' } }
    /**
     * Find zero or one ScanFinding that matches the filter.
     * @param {ScanFindingFindUniqueArgs} args - Arguments to find a ScanFinding
     * @example
     * // Get one ScanFinding
     * const scanFinding = await prisma.scanFinding.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ScanFindingFindUniqueArgs>(args: SelectSubset<T, ScanFindingFindUniqueArgs<ExtArgs>>): Prisma__ScanFindingClient<$Result.GetResult<Prisma.$ScanFindingPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ScanFinding that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ScanFindingFindUniqueOrThrowArgs} args - Arguments to find a ScanFinding
     * @example
     * // Get one ScanFinding
     * const scanFinding = await prisma.scanFinding.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ScanFindingFindUniqueOrThrowArgs>(args: SelectSubset<T, ScanFindingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ScanFindingClient<$Result.GetResult<Prisma.$ScanFindingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ScanFinding that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanFindingFindFirstArgs} args - Arguments to find a ScanFinding
     * @example
     * // Get one ScanFinding
     * const scanFinding = await prisma.scanFinding.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ScanFindingFindFirstArgs>(args?: SelectSubset<T, ScanFindingFindFirstArgs<ExtArgs>>): Prisma__ScanFindingClient<$Result.GetResult<Prisma.$ScanFindingPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ScanFinding that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanFindingFindFirstOrThrowArgs} args - Arguments to find a ScanFinding
     * @example
     * // Get one ScanFinding
     * const scanFinding = await prisma.scanFinding.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ScanFindingFindFirstOrThrowArgs>(args?: SelectSubset<T, ScanFindingFindFirstOrThrowArgs<ExtArgs>>): Prisma__ScanFindingClient<$Result.GetResult<Prisma.$ScanFindingPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ScanFindings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanFindingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ScanFindings
     * const scanFindings = await prisma.scanFinding.findMany()
     * 
     * // Get first 10 ScanFindings
     * const scanFindings = await prisma.scanFinding.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const scanFindingWithIdOnly = await prisma.scanFinding.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ScanFindingFindManyArgs>(args?: SelectSubset<T, ScanFindingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanFindingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ScanFinding.
     * @param {ScanFindingCreateArgs} args - Arguments to create a ScanFinding.
     * @example
     * // Create one ScanFinding
     * const ScanFinding = await prisma.scanFinding.create({
     *   data: {
     *     // ... data to create a ScanFinding
     *   }
     * })
     * 
     */
    create<T extends ScanFindingCreateArgs>(args: SelectSubset<T, ScanFindingCreateArgs<ExtArgs>>): Prisma__ScanFindingClient<$Result.GetResult<Prisma.$ScanFindingPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ScanFindings.
     * @param {ScanFindingCreateManyArgs} args - Arguments to create many ScanFindings.
     * @example
     * // Create many ScanFindings
     * const scanFinding = await prisma.scanFinding.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ScanFindingCreateManyArgs>(args?: SelectSubset<T, ScanFindingCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ScanFindings and returns the data saved in the database.
     * @param {ScanFindingCreateManyAndReturnArgs} args - Arguments to create many ScanFindings.
     * @example
     * // Create many ScanFindings
     * const scanFinding = await prisma.scanFinding.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ScanFindings and only return the `id`
     * const scanFindingWithIdOnly = await prisma.scanFinding.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ScanFindingCreateManyAndReturnArgs>(args?: SelectSubset<T, ScanFindingCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanFindingPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ScanFinding.
     * @param {ScanFindingDeleteArgs} args - Arguments to delete one ScanFinding.
     * @example
     * // Delete one ScanFinding
     * const ScanFinding = await prisma.scanFinding.delete({
     *   where: {
     *     // ... filter to delete one ScanFinding
     *   }
     * })
     * 
     */
    delete<T extends ScanFindingDeleteArgs>(args: SelectSubset<T, ScanFindingDeleteArgs<ExtArgs>>): Prisma__ScanFindingClient<$Result.GetResult<Prisma.$ScanFindingPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ScanFinding.
     * @param {ScanFindingUpdateArgs} args - Arguments to update one ScanFinding.
     * @example
     * // Update one ScanFinding
     * const scanFinding = await prisma.scanFinding.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ScanFindingUpdateArgs>(args: SelectSubset<T, ScanFindingUpdateArgs<ExtArgs>>): Prisma__ScanFindingClient<$Result.GetResult<Prisma.$ScanFindingPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ScanFindings.
     * @param {ScanFindingDeleteManyArgs} args - Arguments to filter ScanFindings to delete.
     * @example
     * // Delete a few ScanFindings
     * const { count } = await prisma.scanFinding.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ScanFindingDeleteManyArgs>(args?: SelectSubset<T, ScanFindingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ScanFindings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanFindingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ScanFindings
     * const scanFinding = await prisma.scanFinding.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ScanFindingUpdateManyArgs>(args: SelectSubset<T, ScanFindingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ScanFindings and returns the data updated in the database.
     * @param {ScanFindingUpdateManyAndReturnArgs} args - Arguments to update many ScanFindings.
     * @example
     * // Update many ScanFindings
     * const scanFinding = await prisma.scanFinding.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ScanFindings and only return the `id`
     * const scanFindingWithIdOnly = await prisma.scanFinding.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ScanFindingUpdateManyAndReturnArgs>(args: SelectSubset<T, ScanFindingUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanFindingPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ScanFinding.
     * @param {ScanFindingUpsertArgs} args - Arguments to update or create a ScanFinding.
     * @example
     * // Update or create a ScanFinding
     * const scanFinding = await prisma.scanFinding.upsert({
     *   create: {
     *     // ... data to create a ScanFinding
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ScanFinding we want to update
     *   }
     * })
     */
    upsert<T extends ScanFindingUpsertArgs>(args: SelectSubset<T, ScanFindingUpsertArgs<ExtArgs>>): Prisma__ScanFindingClient<$Result.GetResult<Prisma.$ScanFindingPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ScanFindings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanFindingCountArgs} args - Arguments to filter ScanFindings to count.
     * @example
     * // Count the number of ScanFindings
     * const count = await prisma.scanFinding.count({
     *   where: {
     *     // ... the filter for the ScanFindings we want to count
     *   }
     * })
    **/
    count<T extends ScanFindingCountArgs>(
      args?: Subset<T, ScanFindingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ScanFindingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ScanFinding.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanFindingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ScanFindingAggregateArgs>(args: Subset<T, ScanFindingAggregateArgs>): Prisma.PrismaPromise<GetScanFindingAggregateType<T>>

    /**
     * Group by ScanFinding.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanFindingGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ScanFindingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ScanFindingGroupByArgs['orderBy'] }
        : { orderBy?: ScanFindingGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ScanFindingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetScanFindingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ScanFinding model
   */
  readonly fields: ScanFindingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ScanFinding.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ScanFindingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    scanRun<T extends ScanRunDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ScanRunDefaultArgs<ExtArgs>>): Prisma__ScanRunClient<$Result.GetResult<Prisma.$ScanRunPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    scanTactic<T extends ScanTacticDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ScanTacticDefaultArgs<ExtArgs>>): Prisma__ScanTacticClient<$Result.GetResult<Prisma.$ScanTacticPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    routeFindings<T extends ScanFinding$routeFindingsArgs<ExtArgs> = {}>(args?: Subset<T, ScanFinding$routeFindingsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EscalationRouteFindingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ScanFinding model
   */
  interface ScanFindingFieldRefs {
    readonly id: FieldRef<"ScanFinding", 'String'>
    readonly scanRunId: FieldRef<"ScanFinding", 'String'>
    readonly scanTacticId: FieldRef<"ScanFinding", 'String'>
    readonly agentId: FieldRef<"ScanFinding", 'String'>
    readonly severity: FieldRef<"ScanFinding", 'String'>
    readonly confidence: FieldRef<"ScanFinding", 'Float'>
    readonly title: FieldRef<"ScanFinding", 'String'>
    readonly description: FieldRef<"ScanFinding", 'String'>
    readonly evidence: FieldRef<"ScanFinding", 'String'>
    readonly technique: FieldRef<"ScanFinding", 'String'>
    readonly reproduceCommand: FieldRef<"ScanFinding", 'String'>
    readonly validated: FieldRef<"ScanFinding", 'Boolean'>
    readonly validationStatus: FieldRef<"ScanFinding", 'String'>
    readonly evidenceRefs: FieldRef<"ScanFinding", 'Json'>
    readonly sourceToolRuns: FieldRef<"ScanFinding", 'Json'>
    readonly confidenceReason: FieldRef<"ScanFinding", 'String'>
    readonly createdAt: FieldRef<"ScanFinding", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ScanFinding findUnique
   */
  export type ScanFindingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanFinding
     */
    select?: ScanFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanFinding
     */
    omit?: ScanFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanFindingInclude<ExtArgs> | null
    /**
     * Filter, which ScanFinding to fetch.
     */
    where: ScanFindingWhereUniqueInput
  }

  /**
   * ScanFinding findUniqueOrThrow
   */
  export type ScanFindingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanFinding
     */
    select?: ScanFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanFinding
     */
    omit?: ScanFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanFindingInclude<ExtArgs> | null
    /**
     * Filter, which ScanFinding to fetch.
     */
    where: ScanFindingWhereUniqueInput
  }

  /**
   * ScanFinding findFirst
   */
  export type ScanFindingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanFinding
     */
    select?: ScanFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanFinding
     */
    omit?: ScanFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanFindingInclude<ExtArgs> | null
    /**
     * Filter, which ScanFinding to fetch.
     */
    where?: ScanFindingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanFindings to fetch.
     */
    orderBy?: ScanFindingOrderByWithRelationInput | ScanFindingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ScanFindings.
     */
    cursor?: ScanFindingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanFindings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanFindings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ScanFindings.
     */
    distinct?: ScanFindingScalarFieldEnum | ScanFindingScalarFieldEnum[]
  }

  /**
   * ScanFinding findFirstOrThrow
   */
  export type ScanFindingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanFinding
     */
    select?: ScanFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanFinding
     */
    omit?: ScanFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanFindingInclude<ExtArgs> | null
    /**
     * Filter, which ScanFinding to fetch.
     */
    where?: ScanFindingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanFindings to fetch.
     */
    orderBy?: ScanFindingOrderByWithRelationInput | ScanFindingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ScanFindings.
     */
    cursor?: ScanFindingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanFindings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanFindings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ScanFindings.
     */
    distinct?: ScanFindingScalarFieldEnum | ScanFindingScalarFieldEnum[]
  }

  /**
   * ScanFinding findMany
   */
  export type ScanFindingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanFinding
     */
    select?: ScanFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanFinding
     */
    omit?: ScanFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanFindingInclude<ExtArgs> | null
    /**
     * Filter, which ScanFindings to fetch.
     */
    where?: ScanFindingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanFindings to fetch.
     */
    orderBy?: ScanFindingOrderByWithRelationInput | ScanFindingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ScanFindings.
     */
    cursor?: ScanFindingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanFindings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanFindings.
     */
    skip?: number
    distinct?: ScanFindingScalarFieldEnum | ScanFindingScalarFieldEnum[]
  }

  /**
   * ScanFinding create
   */
  export type ScanFindingCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanFinding
     */
    select?: ScanFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanFinding
     */
    omit?: ScanFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanFindingInclude<ExtArgs> | null
    /**
     * The data needed to create a ScanFinding.
     */
    data: XOR<ScanFindingCreateInput, ScanFindingUncheckedCreateInput>
  }

  /**
   * ScanFinding createMany
   */
  export type ScanFindingCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ScanFindings.
     */
    data: ScanFindingCreateManyInput | ScanFindingCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ScanFinding createManyAndReturn
   */
  export type ScanFindingCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanFinding
     */
    select?: ScanFindingSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ScanFinding
     */
    omit?: ScanFindingOmit<ExtArgs> | null
    /**
     * The data used to create many ScanFindings.
     */
    data: ScanFindingCreateManyInput | ScanFindingCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanFindingIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ScanFinding update
   */
  export type ScanFindingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanFinding
     */
    select?: ScanFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanFinding
     */
    omit?: ScanFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanFindingInclude<ExtArgs> | null
    /**
     * The data needed to update a ScanFinding.
     */
    data: XOR<ScanFindingUpdateInput, ScanFindingUncheckedUpdateInput>
    /**
     * Choose, which ScanFinding to update.
     */
    where: ScanFindingWhereUniqueInput
  }

  /**
   * ScanFinding updateMany
   */
  export type ScanFindingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ScanFindings.
     */
    data: XOR<ScanFindingUpdateManyMutationInput, ScanFindingUncheckedUpdateManyInput>
    /**
     * Filter which ScanFindings to update
     */
    where?: ScanFindingWhereInput
    /**
     * Limit how many ScanFindings to update.
     */
    limit?: number
  }

  /**
   * ScanFinding updateManyAndReturn
   */
  export type ScanFindingUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanFinding
     */
    select?: ScanFindingSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ScanFinding
     */
    omit?: ScanFindingOmit<ExtArgs> | null
    /**
     * The data used to update ScanFindings.
     */
    data: XOR<ScanFindingUpdateManyMutationInput, ScanFindingUncheckedUpdateManyInput>
    /**
     * Filter which ScanFindings to update
     */
    where?: ScanFindingWhereInput
    /**
     * Limit how many ScanFindings to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanFindingIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ScanFinding upsert
   */
  export type ScanFindingUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanFinding
     */
    select?: ScanFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanFinding
     */
    omit?: ScanFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanFindingInclude<ExtArgs> | null
    /**
     * The filter to search for the ScanFinding to update in case it exists.
     */
    where: ScanFindingWhereUniqueInput
    /**
     * In case the ScanFinding found by the `where` argument doesn't exist, create a new ScanFinding with this data.
     */
    create: XOR<ScanFindingCreateInput, ScanFindingUncheckedCreateInput>
    /**
     * In case the ScanFinding was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ScanFindingUpdateInput, ScanFindingUncheckedUpdateInput>
  }

  /**
   * ScanFinding delete
   */
  export type ScanFindingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanFinding
     */
    select?: ScanFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanFinding
     */
    omit?: ScanFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanFindingInclude<ExtArgs> | null
    /**
     * Filter which ScanFinding to delete.
     */
    where: ScanFindingWhereUniqueInput
  }

  /**
   * ScanFinding deleteMany
   */
  export type ScanFindingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ScanFindings to delete
     */
    where?: ScanFindingWhereInput
    /**
     * Limit how many ScanFindings to delete.
     */
    limit?: number
  }

  /**
   * ScanFinding.routeFindings
   */
  export type ScanFinding$routeFindingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRouteFinding
     */
    select?: EscalationRouteFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRouteFinding
     */
    omit?: EscalationRouteFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteFindingInclude<ExtArgs> | null
    where?: EscalationRouteFindingWhereInput
    orderBy?: EscalationRouteFindingOrderByWithRelationInput | EscalationRouteFindingOrderByWithRelationInput[]
    cursor?: EscalationRouteFindingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: EscalationRouteFindingScalarFieldEnum | EscalationRouteFindingScalarFieldEnum[]
  }

  /**
   * ScanFinding without action
   */
  export type ScanFindingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanFinding
     */
    select?: ScanFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanFinding
     */
    omit?: ScanFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanFindingInclude<ExtArgs> | null
  }


  /**
   * Model ScanAuditEntry
   */

  export type AggregateScanAuditEntry = {
    _count: ScanAuditEntryCountAggregateOutputType | null
    _min: ScanAuditEntryMinAggregateOutputType | null
    _max: ScanAuditEntryMaxAggregateOutputType | null
  }

  export type ScanAuditEntryMinAggregateOutputType = {
    id: string | null
    scanRunId: string | null
    timestamp: Date | null
    actor: string | null
    action: string | null
    targetTacticId: string | null
    scopeValid: boolean | null
  }

  export type ScanAuditEntryMaxAggregateOutputType = {
    id: string | null
    scanRunId: string | null
    timestamp: Date | null
    actor: string | null
    action: string | null
    targetTacticId: string | null
    scopeValid: boolean | null
  }

  export type ScanAuditEntryCountAggregateOutputType = {
    id: number
    scanRunId: number
    timestamp: number
    actor: number
    action: number
    targetTacticId: number
    scopeValid: number
    details: number
    _all: number
  }


  export type ScanAuditEntryMinAggregateInputType = {
    id?: true
    scanRunId?: true
    timestamp?: true
    actor?: true
    action?: true
    targetTacticId?: true
    scopeValid?: true
  }

  export type ScanAuditEntryMaxAggregateInputType = {
    id?: true
    scanRunId?: true
    timestamp?: true
    actor?: true
    action?: true
    targetTacticId?: true
    scopeValid?: true
  }

  export type ScanAuditEntryCountAggregateInputType = {
    id?: true
    scanRunId?: true
    timestamp?: true
    actor?: true
    action?: true
    targetTacticId?: true
    scopeValid?: true
    details?: true
    _all?: true
  }

  export type ScanAuditEntryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ScanAuditEntry to aggregate.
     */
    where?: ScanAuditEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanAuditEntries to fetch.
     */
    orderBy?: ScanAuditEntryOrderByWithRelationInput | ScanAuditEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ScanAuditEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanAuditEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanAuditEntries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ScanAuditEntries
    **/
    _count?: true | ScanAuditEntryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ScanAuditEntryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ScanAuditEntryMaxAggregateInputType
  }

  export type GetScanAuditEntryAggregateType<T extends ScanAuditEntryAggregateArgs> = {
        [P in keyof T & keyof AggregateScanAuditEntry]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateScanAuditEntry[P]>
      : GetScalarType<T[P], AggregateScanAuditEntry[P]>
  }




  export type ScanAuditEntryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ScanAuditEntryWhereInput
    orderBy?: ScanAuditEntryOrderByWithAggregationInput | ScanAuditEntryOrderByWithAggregationInput[]
    by: ScanAuditEntryScalarFieldEnum[] | ScanAuditEntryScalarFieldEnum
    having?: ScanAuditEntryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ScanAuditEntryCountAggregateInputType | true
    _min?: ScanAuditEntryMinAggregateInputType
    _max?: ScanAuditEntryMaxAggregateInputType
  }

  export type ScanAuditEntryGroupByOutputType = {
    id: string
    scanRunId: string
    timestamp: Date
    actor: string
    action: string
    targetTacticId: string | null
    scopeValid: boolean
    details: JsonValue
    _count: ScanAuditEntryCountAggregateOutputType | null
    _min: ScanAuditEntryMinAggregateOutputType | null
    _max: ScanAuditEntryMaxAggregateOutputType | null
  }

  type GetScanAuditEntryGroupByPayload<T extends ScanAuditEntryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ScanAuditEntryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ScanAuditEntryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ScanAuditEntryGroupByOutputType[P]>
            : GetScalarType<T[P], ScanAuditEntryGroupByOutputType[P]>
        }
      >
    >


  export type ScanAuditEntrySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    scanRunId?: boolean
    timestamp?: boolean
    actor?: boolean
    action?: boolean
    targetTacticId?: boolean
    scopeValid?: boolean
    details?: boolean
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["scanAuditEntry"]>

  export type ScanAuditEntrySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    scanRunId?: boolean
    timestamp?: boolean
    actor?: boolean
    action?: boolean
    targetTacticId?: boolean
    scopeValid?: boolean
    details?: boolean
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["scanAuditEntry"]>

  export type ScanAuditEntrySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    scanRunId?: boolean
    timestamp?: boolean
    actor?: boolean
    action?: boolean
    targetTacticId?: boolean
    scopeValid?: boolean
    details?: boolean
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["scanAuditEntry"]>

  export type ScanAuditEntrySelectScalar = {
    id?: boolean
    scanRunId?: boolean
    timestamp?: boolean
    actor?: boolean
    action?: boolean
    targetTacticId?: boolean
    scopeValid?: boolean
    details?: boolean
  }

  export type ScanAuditEntryOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "scanRunId" | "timestamp" | "actor" | "action" | "targetTacticId" | "scopeValid" | "details", ExtArgs["result"]["scanAuditEntry"]>
  export type ScanAuditEntryInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
  }
  export type ScanAuditEntryIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
  }
  export type ScanAuditEntryIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
  }

  export type $ScanAuditEntryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ScanAuditEntry"
    objects: {
      scanRun: Prisma.$ScanRunPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      scanRunId: string
      timestamp: Date
      actor: string
      action: string
      targetTacticId: string | null
      scopeValid: boolean
      details: Prisma.JsonValue
    }, ExtArgs["result"]["scanAuditEntry"]>
    composites: {}
  }

  type ScanAuditEntryGetPayload<S extends boolean | null | undefined | ScanAuditEntryDefaultArgs> = $Result.GetResult<Prisma.$ScanAuditEntryPayload, S>

  type ScanAuditEntryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ScanAuditEntryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ScanAuditEntryCountAggregateInputType | true
    }

  export interface ScanAuditEntryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ScanAuditEntry'], meta: { name: 'ScanAuditEntry' } }
    /**
     * Find zero or one ScanAuditEntry that matches the filter.
     * @param {ScanAuditEntryFindUniqueArgs} args - Arguments to find a ScanAuditEntry
     * @example
     * // Get one ScanAuditEntry
     * const scanAuditEntry = await prisma.scanAuditEntry.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ScanAuditEntryFindUniqueArgs>(args: SelectSubset<T, ScanAuditEntryFindUniqueArgs<ExtArgs>>): Prisma__ScanAuditEntryClient<$Result.GetResult<Prisma.$ScanAuditEntryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ScanAuditEntry that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ScanAuditEntryFindUniqueOrThrowArgs} args - Arguments to find a ScanAuditEntry
     * @example
     * // Get one ScanAuditEntry
     * const scanAuditEntry = await prisma.scanAuditEntry.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ScanAuditEntryFindUniqueOrThrowArgs>(args: SelectSubset<T, ScanAuditEntryFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ScanAuditEntryClient<$Result.GetResult<Prisma.$ScanAuditEntryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ScanAuditEntry that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanAuditEntryFindFirstArgs} args - Arguments to find a ScanAuditEntry
     * @example
     * // Get one ScanAuditEntry
     * const scanAuditEntry = await prisma.scanAuditEntry.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ScanAuditEntryFindFirstArgs>(args?: SelectSubset<T, ScanAuditEntryFindFirstArgs<ExtArgs>>): Prisma__ScanAuditEntryClient<$Result.GetResult<Prisma.$ScanAuditEntryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ScanAuditEntry that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanAuditEntryFindFirstOrThrowArgs} args - Arguments to find a ScanAuditEntry
     * @example
     * // Get one ScanAuditEntry
     * const scanAuditEntry = await prisma.scanAuditEntry.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ScanAuditEntryFindFirstOrThrowArgs>(args?: SelectSubset<T, ScanAuditEntryFindFirstOrThrowArgs<ExtArgs>>): Prisma__ScanAuditEntryClient<$Result.GetResult<Prisma.$ScanAuditEntryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ScanAuditEntries that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanAuditEntryFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ScanAuditEntries
     * const scanAuditEntries = await prisma.scanAuditEntry.findMany()
     * 
     * // Get first 10 ScanAuditEntries
     * const scanAuditEntries = await prisma.scanAuditEntry.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const scanAuditEntryWithIdOnly = await prisma.scanAuditEntry.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ScanAuditEntryFindManyArgs>(args?: SelectSubset<T, ScanAuditEntryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanAuditEntryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ScanAuditEntry.
     * @param {ScanAuditEntryCreateArgs} args - Arguments to create a ScanAuditEntry.
     * @example
     * // Create one ScanAuditEntry
     * const ScanAuditEntry = await prisma.scanAuditEntry.create({
     *   data: {
     *     // ... data to create a ScanAuditEntry
     *   }
     * })
     * 
     */
    create<T extends ScanAuditEntryCreateArgs>(args: SelectSubset<T, ScanAuditEntryCreateArgs<ExtArgs>>): Prisma__ScanAuditEntryClient<$Result.GetResult<Prisma.$ScanAuditEntryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ScanAuditEntries.
     * @param {ScanAuditEntryCreateManyArgs} args - Arguments to create many ScanAuditEntries.
     * @example
     * // Create many ScanAuditEntries
     * const scanAuditEntry = await prisma.scanAuditEntry.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ScanAuditEntryCreateManyArgs>(args?: SelectSubset<T, ScanAuditEntryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ScanAuditEntries and returns the data saved in the database.
     * @param {ScanAuditEntryCreateManyAndReturnArgs} args - Arguments to create many ScanAuditEntries.
     * @example
     * // Create many ScanAuditEntries
     * const scanAuditEntry = await prisma.scanAuditEntry.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ScanAuditEntries and only return the `id`
     * const scanAuditEntryWithIdOnly = await prisma.scanAuditEntry.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ScanAuditEntryCreateManyAndReturnArgs>(args?: SelectSubset<T, ScanAuditEntryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanAuditEntryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ScanAuditEntry.
     * @param {ScanAuditEntryDeleteArgs} args - Arguments to delete one ScanAuditEntry.
     * @example
     * // Delete one ScanAuditEntry
     * const ScanAuditEntry = await prisma.scanAuditEntry.delete({
     *   where: {
     *     // ... filter to delete one ScanAuditEntry
     *   }
     * })
     * 
     */
    delete<T extends ScanAuditEntryDeleteArgs>(args: SelectSubset<T, ScanAuditEntryDeleteArgs<ExtArgs>>): Prisma__ScanAuditEntryClient<$Result.GetResult<Prisma.$ScanAuditEntryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ScanAuditEntry.
     * @param {ScanAuditEntryUpdateArgs} args - Arguments to update one ScanAuditEntry.
     * @example
     * // Update one ScanAuditEntry
     * const scanAuditEntry = await prisma.scanAuditEntry.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ScanAuditEntryUpdateArgs>(args: SelectSubset<T, ScanAuditEntryUpdateArgs<ExtArgs>>): Prisma__ScanAuditEntryClient<$Result.GetResult<Prisma.$ScanAuditEntryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ScanAuditEntries.
     * @param {ScanAuditEntryDeleteManyArgs} args - Arguments to filter ScanAuditEntries to delete.
     * @example
     * // Delete a few ScanAuditEntries
     * const { count } = await prisma.scanAuditEntry.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ScanAuditEntryDeleteManyArgs>(args?: SelectSubset<T, ScanAuditEntryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ScanAuditEntries.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanAuditEntryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ScanAuditEntries
     * const scanAuditEntry = await prisma.scanAuditEntry.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ScanAuditEntryUpdateManyArgs>(args: SelectSubset<T, ScanAuditEntryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ScanAuditEntries and returns the data updated in the database.
     * @param {ScanAuditEntryUpdateManyAndReturnArgs} args - Arguments to update many ScanAuditEntries.
     * @example
     * // Update many ScanAuditEntries
     * const scanAuditEntry = await prisma.scanAuditEntry.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ScanAuditEntries and only return the `id`
     * const scanAuditEntryWithIdOnly = await prisma.scanAuditEntry.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ScanAuditEntryUpdateManyAndReturnArgs>(args: SelectSubset<T, ScanAuditEntryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanAuditEntryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ScanAuditEntry.
     * @param {ScanAuditEntryUpsertArgs} args - Arguments to update or create a ScanAuditEntry.
     * @example
     * // Update or create a ScanAuditEntry
     * const scanAuditEntry = await prisma.scanAuditEntry.upsert({
     *   create: {
     *     // ... data to create a ScanAuditEntry
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ScanAuditEntry we want to update
     *   }
     * })
     */
    upsert<T extends ScanAuditEntryUpsertArgs>(args: SelectSubset<T, ScanAuditEntryUpsertArgs<ExtArgs>>): Prisma__ScanAuditEntryClient<$Result.GetResult<Prisma.$ScanAuditEntryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ScanAuditEntries.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanAuditEntryCountArgs} args - Arguments to filter ScanAuditEntries to count.
     * @example
     * // Count the number of ScanAuditEntries
     * const count = await prisma.scanAuditEntry.count({
     *   where: {
     *     // ... the filter for the ScanAuditEntries we want to count
     *   }
     * })
    **/
    count<T extends ScanAuditEntryCountArgs>(
      args?: Subset<T, ScanAuditEntryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ScanAuditEntryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ScanAuditEntry.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanAuditEntryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ScanAuditEntryAggregateArgs>(args: Subset<T, ScanAuditEntryAggregateArgs>): Prisma.PrismaPromise<GetScanAuditEntryAggregateType<T>>

    /**
     * Group by ScanAuditEntry.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanAuditEntryGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ScanAuditEntryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ScanAuditEntryGroupByArgs['orderBy'] }
        : { orderBy?: ScanAuditEntryGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ScanAuditEntryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetScanAuditEntryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ScanAuditEntry model
   */
  readonly fields: ScanAuditEntryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ScanAuditEntry.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ScanAuditEntryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    scanRun<T extends ScanRunDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ScanRunDefaultArgs<ExtArgs>>): Prisma__ScanRunClient<$Result.GetResult<Prisma.$ScanRunPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ScanAuditEntry model
   */
  interface ScanAuditEntryFieldRefs {
    readonly id: FieldRef<"ScanAuditEntry", 'String'>
    readonly scanRunId: FieldRef<"ScanAuditEntry", 'String'>
    readonly timestamp: FieldRef<"ScanAuditEntry", 'DateTime'>
    readonly actor: FieldRef<"ScanAuditEntry", 'String'>
    readonly action: FieldRef<"ScanAuditEntry", 'String'>
    readonly targetTacticId: FieldRef<"ScanAuditEntry", 'String'>
    readonly scopeValid: FieldRef<"ScanAuditEntry", 'Boolean'>
    readonly details: FieldRef<"ScanAuditEntry", 'Json'>
  }
    

  // Custom InputTypes
  /**
   * ScanAuditEntry findUnique
   */
  export type ScanAuditEntryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanAuditEntry
     */
    select?: ScanAuditEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanAuditEntry
     */
    omit?: ScanAuditEntryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanAuditEntryInclude<ExtArgs> | null
    /**
     * Filter, which ScanAuditEntry to fetch.
     */
    where: ScanAuditEntryWhereUniqueInput
  }

  /**
   * ScanAuditEntry findUniqueOrThrow
   */
  export type ScanAuditEntryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanAuditEntry
     */
    select?: ScanAuditEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanAuditEntry
     */
    omit?: ScanAuditEntryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanAuditEntryInclude<ExtArgs> | null
    /**
     * Filter, which ScanAuditEntry to fetch.
     */
    where: ScanAuditEntryWhereUniqueInput
  }

  /**
   * ScanAuditEntry findFirst
   */
  export type ScanAuditEntryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanAuditEntry
     */
    select?: ScanAuditEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanAuditEntry
     */
    omit?: ScanAuditEntryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanAuditEntryInclude<ExtArgs> | null
    /**
     * Filter, which ScanAuditEntry to fetch.
     */
    where?: ScanAuditEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanAuditEntries to fetch.
     */
    orderBy?: ScanAuditEntryOrderByWithRelationInput | ScanAuditEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ScanAuditEntries.
     */
    cursor?: ScanAuditEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanAuditEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanAuditEntries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ScanAuditEntries.
     */
    distinct?: ScanAuditEntryScalarFieldEnum | ScanAuditEntryScalarFieldEnum[]
  }

  /**
   * ScanAuditEntry findFirstOrThrow
   */
  export type ScanAuditEntryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanAuditEntry
     */
    select?: ScanAuditEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanAuditEntry
     */
    omit?: ScanAuditEntryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanAuditEntryInclude<ExtArgs> | null
    /**
     * Filter, which ScanAuditEntry to fetch.
     */
    where?: ScanAuditEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanAuditEntries to fetch.
     */
    orderBy?: ScanAuditEntryOrderByWithRelationInput | ScanAuditEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ScanAuditEntries.
     */
    cursor?: ScanAuditEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanAuditEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanAuditEntries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ScanAuditEntries.
     */
    distinct?: ScanAuditEntryScalarFieldEnum | ScanAuditEntryScalarFieldEnum[]
  }

  /**
   * ScanAuditEntry findMany
   */
  export type ScanAuditEntryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanAuditEntry
     */
    select?: ScanAuditEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanAuditEntry
     */
    omit?: ScanAuditEntryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanAuditEntryInclude<ExtArgs> | null
    /**
     * Filter, which ScanAuditEntries to fetch.
     */
    where?: ScanAuditEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanAuditEntries to fetch.
     */
    orderBy?: ScanAuditEntryOrderByWithRelationInput | ScanAuditEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ScanAuditEntries.
     */
    cursor?: ScanAuditEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanAuditEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanAuditEntries.
     */
    skip?: number
    distinct?: ScanAuditEntryScalarFieldEnum | ScanAuditEntryScalarFieldEnum[]
  }

  /**
   * ScanAuditEntry create
   */
  export type ScanAuditEntryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanAuditEntry
     */
    select?: ScanAuditEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanAuditEntry
     */
    omit?: ScanAuditEntryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanAuditEntryInclude<ExtArgs> | null
    /**
     * The data needed to create a ScanAuditEntry.
     */
    data: XOR<ScanAuditEntryCreateInput, ScanAuditEntryUncheckedCreateInput>
  }

  /**
   * ScanAuditEntry createMany
   */
  export type ScanAuditEntryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ScanAuditEntries.
     */
    data: ScanAuditEntryCreateManyInput | ScanAuditEntryCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ScanAuditEntry createManyAndReturn
   */
  export type ScanAuditEntryCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanAuditEntry
     */
    select?: ScanAuditEntrySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ScanAuditEntry
     */
    omit?: ScanAuditEntryOmit<ExtArgs> | null
    /**
     * The data used to create many ScanAuditEntries.
     */
    data: ScanAuditEntryCreateManyInput | ScanAuditEntryCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanAuditEntryIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ScanAuditEntry update
   */
  export type ScanAuditEntryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanAuditEntry
     */
    select?: ScanAuditEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanAuditEntry
     */
    omit?: ScanAuditEntryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanAuditEntryInclude<ExtArgs> | null
    /**
     * The data needed to update a ScanAuditEntry.
     */
    data: XOR<ScanAuditEntryUpdateInput, ScanAuditEntryUncheckedUpdateInput>
    /**
     * Choose, which ScanAuditEntry to update.
     */
    where: ScanAuditEntryWhereUniqueInput
  }

  /**
   * ScanAuditEntry updateMany
   */
  export type ScanAuditEntryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ScanAuditEntries.
     */
    data: XOR<ScanAuditEntryUpdateManyMutationInput, ScanAuditEntryUncheckedUpdateManyInput>
    /**
     * Filter which ScanAuditEntries to update
     */
    where?: ScanAuditEntryWhereInput
    /**
     * Limit how many ScanAuditEntries to update.
     */
    limit?: number
  }

  /**
   * ScanAuditEntry updateManyAndReturn
   */
  export type ScanAuditEntryUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanAuditEntry
     */
    select?: ScanAuditEntrySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ScanAuditEntry
     */
    omit?: ScanAuditEntryOmit<ExtArgs> | null
    /**
     * The data used to update ScanAuditEntries.
     */
    data: XOR<ScanAuditEntryUpdateManyMutationInput, ScanAuditEntryUncheckedUpdateManyInput>
    /**
     * Filter which ScanAuditEntries to update
     */
    where?: ScanAuditEntryWhereInput
    /**
     * Limit how many ScanAuditEntries to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanAuditEntryIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ScanAuditEntry upsert
   */
  export type ScanAuditEntryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanAuditEntry
     */
    select?: ScanAuditEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanAuditEntry
     */
    omit?: ScanAuditEntryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanAuditEntryInclude<ExtArgs> | null
    /**
     * The filter to search for the ScanAuditEntry to update in case it exists.
     */
    where: ScanAuditEntryWhereUniqueInput
    /**
     * In case the ScanAuditEntry found by the `where` argument doesn't exist, create a new ScanAuditEntry with this data.
     */
    create: XOR<ScanAuditEntryCreateInput, ScanAuditEntryUncheckedCreateInput>
    /**
     * In case the ScanAuditEntry was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ScanAuditEntryUpdateInput, ScanAuditEntryUncheckedUpdateInput>
  }

  /**
   * ScanAuditEntry delete
   */
  export type ScanAuditEntryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanAuditEntry
     */
    select?: ScanAuditEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanAuditEntry
     */
    omit?: ScanAuditEntryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanAuditEntryInclude<ExtArgs> | null
    /**
     * Filter which ScanAuditEntry to delete.
     */
    where: ScanAuditEntryWhereUniqueInput
  }

  /**
   * ScanAuditEntry deleteMany
   */
  export type ScanAuditEntryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ScanAuditEntries to delete
     */
    where?: ScanAuditEntryWhereInput
    /**
     * Limit how many ScanAuditEntries to delete.
     */
    limit?: number
  }

  /**
   * ScanAuditEntry without action
   */
  export type ScanAuditEntryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanAuditEntry
     */
    select?: ScanAuditEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScanAuditEntry
     */
    omit?: ScanAuditEntryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScanAuditEntryInclude<ExtArgs> | null
  }


  /**
   * Model EscalationRoute
   */

  export type AggregateEscalationRoute = {
    _count: EscalationRouteCountAggregateOutputType | null
    _avg: EscalationRouteAvgAggregateOutputType | null
    _sum: EscalationRouteSumAggregateOutputType | null
    _min: EscalationRouteMinAggregateOutputType | null
    _max: EscalationRouteMaxAggregateOutputType | null
  }

  export type EscalationRouteAvgAggregateOutputType = {
    compositeRisk: number | null
    routeLength: number | null
    confidence: number | null
  }

  export type EscalationRouteSumAggregateOutputType = {
    compositeRisk: number | null
    routeLength: number | null
    confidence: number | null
  }

  export type EscalationRouteMinAggregateOutputType = {
    id: string | null
    scanRunId: string | null
    title: string | null
    compositeRisk: number | null
    technique: string | null
    startTarget: string | null
    endTarget: string | null
    routeLength: number | null
    confidence: number | null
    narrative: string | null
    createdAt: Date | null
  }

  export type EscalationRouteMaxAggregateOutputType = {
    id: string | null
    scanRunId: string | null
    title: string | null
    compositeRisk: number | null
    technique: string | null
    startTarget: string | null
    endTarget: string | null
    routeLength: number | null
    confidence: number | null
    narrative: string | null
    createdAt: Date | null
  }

  export type EscalationRouteCountAggregateOutputType = {
    id: number
    scanRunId: number
    title: number
    compositeRisk: number
    technique: number
    startTarget: number
    endTarget: number
    routeLength: number
    confidence: number
    narrative: number
    createdAt: number
    _all: number
  }


  export type EscalationRouteAvgAggregateInputType = {
    compositeRisk?: true
    routeLength?: true
    confidence?: true
  }

  export type EscalationRouteSumAggregateInputType = {
    compositeRisk?: true
    routeLength?: true
    confidence?: true
  }

  export type EscalationRouteMinAggregateInputType = {
    id?: true
    scanRunId?: true
    title?: true
    compositeRisk?: true
    technique?: true
    startTarget?: true
    endTarget?: true
    routeLength?: true
    confidence?: true
    narrative?: true
    createdAt?: true
  }

  export type EscalationRouteMaxAggregateInputType = {
    id?: true
    scanRunId?: true
    title?: true
    compositeRisk?: true
    technique?: true
    startTarget?: true
    endTarget?: true
    routeLength?: true
    confidence?: true
    narrative?: true
    createdAt?: true
  }

  export type EscalationRouteCountAggregateInputType = {
    id?: true
    scanRunId?: true
    title?: true
    compositeRisk?: true
    technique?: true
    startTarget?: true
    endTarget?: true
    routeLength?: true
    confidence?: true
    narrative?: true
    createdAt?: true
    _all?: true
  }

  export type EscalationRouteAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which EscalationRoute to aggregate.
     */
    where?: EscalationRouteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EscalationRoutes to fetch.
     */
    orderBy?: EscalationRouteOrderByWithRelationInput | EscalationRouteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: EscalationRouteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EscalationRoutes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EscalationRoutes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned EscalationRoutes
    **/
    _count?: true | EscalationRouteCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: EscalationRouteAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: EscalationRouteSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: EscalationRouteMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: EscalationRouteMaxAggregateInputType
  }

  export type GetEscalationRouteAggregateType<T extends EscalationRouteAggregateArgs> = {
        [P in keyof T & keyof AggregateEscalationRoute]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateEscalationRoute[P]>
      : GetScalarType<T[P], AggregateEscalationRoute[P]>
  }




  export type EscalationRouteGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EscalationRouteWhereInput
    orderBy?: EscalationRouteOrderByWithAggregationInput | EscalationRouteOrderByWithAggregationInput[]
    by: EscalationRouteScalarFieldEnum[] | EscalationRouteScalarFieldEnum
    having?: EscalationRouteScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: EscalationRouteCountAggregateInputType | true
    _avg?: EscalationRouteAvgAggregateInputType
    _sum?: EscalationRouteSumAggregateInputType
    _min?: EscalationRouteMinAggregateInputType
    _max?: EscalationRouteMaxAggregateInputType
  }

  export type EscalationRouteGroupByOutputType = {
    id: string
    scanRunId: string
    title: string
    compositeRisk: number
    technique: string
    startTarget: string
    endTarget: string
    routeLength: number
    confidence: number
    narrative: string | null
    createdAt: Date
    _count: EscalationRouteCountAggregateOutputType | null
    _avg: EscalationRouteAvgAggregateOutputType | null
    _sum: EscalationRouteSumAggregateOutputType | null
    _min: EscalationRouteMinAggregateOutputType | null
    _max: EscalationRouteMaxAggregateOutputType | null
  }

  type GetEscalationRouteGroupByPayload<T extends EscalationRouteGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<EscalationRouteGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof EscalationRouteGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], EscalationRouteGroupByOutputType[P]>
            : GetScalarType<T[P], EscalationRouteGroupByOutputType[P]>
        }
      >
    >


  export type EscalationRouteSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    scanRunId?: boolean
    title?: boolean
    compositeRisk?: boolean
    technique?: boolean
    startTarget?: boolean
    endTarget?: boolean
    routeLength?: boolean
    confidence?: boolean
    narrative?: boolean
    createdAt?: boolean
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
    routeFindings?: boolean | EscalationRoute$routeFindingsArgs<ExtArgs>
    _count?: boolean | EscalationRouteCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["escalationRoute"]>

  export type EscalationRouteSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    scanRunId?: boolean
    title?: boolean
    compositeRisk?: boolean
    technique?: boolean
    startTarget?: boolean
    endTarget?: boolean
    routeLength?: boolean
    confidence?: boolean
    narrative?: boolean
    createdAt?: boolean
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["escalationRoute"]>

  export type EscalationRouteSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    scanRunId?: boolean
    title?: boolean
    compositeRisk?: boolean
    technique?: boolean
    startTarget?: boolean
    endTarget?: boolean
    routeLength?: boolean
    confidence?: boolean
    narrative?: boolean
    createdAt?: boolean
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["escalationRoute"]>

  export type EscalationRouteSelectScalar = {
    id?: boolean
    scanRunId?: boolean
    title?: boolean
    compositeRisk?: boolean
    technique?: boolean
    startTarget?: boolean
    endTarget?: boolean
    routeLength?: boolean
    confidence?: boolean
    narrative?: boolean
    createdAt?: boolean
  }

  export type EscalationRouteOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "scanRunId" | "title" | "compositeRisk" | "technique" | "startTarget" | "endTarget" | "routeLength" | "confidence" | "narrative" | "createdAt", ExtArgs["result"]["escalationRoute"]>
  export type EscalationRouteInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
    routeFindings?: boolean | EscalationRoute$routeFindingsArgs<ExtArgs>
    _count?: boolean | EscalationRouteCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type EscalationRouteIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
  }
  export type EscalationRouteIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    scanRun?: boolean | ScanRunDefaultArgs<ExtArgs>
  }

  export type $EscalationRoutePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "EscalationRoute"
    objects: {
      scanRun: Prisma.$ScanRunPayload<ExtArgs>
      routeFindings: Prisma.$EscalationRouteFindingPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      scanRunId: string
      title: string
      compositeRisk: number
      technique: string
      startTarget: string
      endTarget: string
      routeLength: number
      confidence: number
      narrative: string | null
      createdAt: Date
    }, ExtArgs["result"]["escalationRoute"]>
    composites: {}
  }

  type EscalationRouteGetPayload<S extends boolean | null | undefined | EscalationRouteDefaultArgs> = $Result.GetResult<Prisma.$EscalationRoutePayload, S>

  type EscalationRouteCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<EscalationRouteFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: EscalationRouteCountAggregateInputType | true
    }

  export interface EscalationRouteDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['EscalationRoute'], meta: { name: 'EscalationRoute' } }
    /**
     * Find zero or one EscalationRoute that matches the filter.
     * @param {EscalationRouteFindUniqueArgs} args - Arguments to find a EscalationRoute
     * @example
     * // Get one EscalationRoute
     * const escalationRoute = await prisma.escalationRoute.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends EscalationRouteFindUniqueArgs>(args: SelectSubset<T, EscalationRouteFindUniqueArgs<ExtArgs>>): Prisma__EscalationRouteClient<$Result.GetResult<Prisma.$EscalationRoutePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one EscalationRoute that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {EscalationRouteFindUniqueOrThrowArgs} args - Arguments to find a EscalationRoute
     * @example
     * // Get one EscalationRoute
     * const escalationRoute = await prisma.escalationRoute.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends EscalationRouteFindUniqueOrThrowArgs>(args: SelectSubset<T, EscalationRouteFindUniqueOrThrowArgs<ExtArgs>>): Prisma__EscalationRouteClient<$Result.GetResult<Prisma.$EscalationRoutePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first EscalationRoute that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EscalationRouteFindFirstArgs} args - Arguments to find a EscalationRoute
     * @example
     * // Get one EscalationRoute
     * const escalationRoute = await prisma.escalationRoute.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends EscalationRouteFindFirstArgs>(args?: SelectSubset<T, EscalationRouteFindFirstArgs<ExtArgs>>): Prisma__EscalationRouteClient<$Result.GetResult<Prisma.$EscalationRoutePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first EscalationRoute that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EscalationRouteFindFirstOrThrowArgs} args - Arguments to find a EscalationRoute
     * @example
     * // Get one EscalationRoute
     * const escalationRoute = await prisma.escalationRoute.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends EscalationRouteFindFirstOrThrowArgs>(args?: SelectSubset<T, EscalationRouteFindFirstOrThrowArgs<ExtArgs>>): Prisma__EscalationRouteClient<$Result.GetResult<Prisma.$EscalationRoutePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more EscalationRoutes that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EscalationRouteFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all EscalationRoutes
     * const escalationRoutes = await prisma.escalationRoute.findMany()
     * 
     * // Get first 10 EscalationRoutes
     * const escalationRoutes = await prisma.escalationRoute.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const escalationRouteWithIdOnly = await prisma.escalationRoute.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends EscalationRouteFindManyArgs>(args?: SelectSubset<T, EscalationRouteFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EscalationRoutePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a EscalationRoute.
     * @param {EscalationRouteCreateArgs} args - Arguments to create a EscalationRoute.
     * @example
     * // Create one EscalationRoute
     * const EscalationRoute = await prisma.escalationRoute.create({
     *   data: {
     *     // ... data to create a EscalationRoute
     *   }
     * })
     * 
     */
    create<T extends EscalationRouteCreateArgs>(args: SelectSubset<T, EscalationRouteCreateArgs<ExtArgs>>): Prisma__EscalationRouteClient<$Result.GetResult<Prisma.$EscalationRoutePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many EscalationRoutes.
     * @param {EscalationRouteCreateManyArgs} args - Arguments to create many EscalationRoutes.
     * @example
     * // Create many EscalationRoutes
     * const escalationRoute = await prisma.escalationRoute.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends EscalationRouteCreateManyArgs>(args?: SelectSubset<T, EscalationRouteCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many EscalationRoutes and returns the data saved in the database.
     * @param {EscalationRouteCreateManyAndReturnArgs} args - Arguments to create many EscalationRoutes.
     * @example
     * // Create many EscalationRoutes
     * const escalationRoute = await prisma.escalationRoute.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many EscalationRoutes and only return the `id`
     * const escalationRouteWithIdOnly = await prisma.escalationRoute.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends EscalationRouteCreateManyAndReturnArgs>(args?: SelectSubset<T, EscalationRouteCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EscalationRoutePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a EscalationRoute.
     * @param {EscalationRouteDeleteArgs} args - Arguments to delete one EscalationRoute.
     * @example
     * // Delete one EscalationRoute
     * const EscalationRoute = await prisma.escalationRoute.delete({
     *   where: {
     *     // ... filter to delete one EscalationRoute
     *   }
     * })
     * 
     */
    delete<T extends EscalationRouteDeleteArgs>(args: SelectSubset<T, EscalationRouteDeleteArgs<ExtArgs>>): Prisma__EscalationRouteClient<$Result.GetResult<Prisma.$EscalationRoutePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one EscalationRoute.
     * @param {EscalationRouteUpdateArgs} args - Arguments to update one EscalationRoute.
     * @example
     * // Update one EscalationRoute
     * const escalationRoute = await prisma.escalationRoute.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends EscalationRouteUpdateArgs>(args: SelectSubset<T, EscalationRouteUpdateArgs<ExtArgs>>): Prisma__EscalationRouteClient<$Result.GetResult<Prisma.$EscalationRoutePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more EscalationRoutes.
     * @param {EscalationRouteDeleteManyArgs} args - Arguments to filter EscalationRoutes to delete.
     * @example
     * // Delete a few EscalationRoutes
     * const { count } = await prisma.escalationRoute.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends EscalationRouteDeleteManyArgs>(args?: SelectSubset<T, EscalationRouteDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more EscalationRoutes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EscalationRouteUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many EscalationRoutes
     * const escalationRoute = await prisma.escalationRoute.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends EscalationRouteUpdateManyArgs>(args: SelectSubset<T, EscalationRouteUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more EscalationRoutes and returns the data updated in the database.
     * @param {EscalationRouteUpdateManyAndReturnArgs} args - Arguments to update many EscalationRoutes.
     * @example
     * // Update many EscalationRoutes
     * const escalationRoute = await prisma.escalationRoute.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more EscalationRoutes and only return the `id`
     * const escalationRouteWithIdOnly = await prisma.escalationRoute.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends EscalationRouteUpdateManyAndReturnArgs>(args: SelectSubset<T, EscalationRouteUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EscalationRoutePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one EscalationRoute.
     * @param {EscalationRouteUpsertArgs} args - Arguments to update or create a EscalationRoute.
     * @example
     * // Update or create a EscalationRoute
     * const escalationRoute = await prisma.escalationRoute.upsert({
     *   create: {
     *     // ... data to create a EscalationRoute
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the EscalationRoute we want to update
     *   }
     * })
     */
    upsert<T extends EscalationRouteUpsertArgs>(args: SelectSubset<T, EscalationRouteUpsertArgs<ExtArgs>>): Prisma__EscalationRouteClient<$Result.GetResult<Prisma.$EscalationRoutePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of EscalationRoutes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EscalationRouteCountArgs} args - Arguments to filter EscalationRoutes to count.
     * @example
     * // Count the number of EscalationRoutes
     * const count = await prisma.escalationRoute.count({
     *   where: {
     *     // ... the filter for the EscalationRoutes we want to count
     *   }
     * })
    **/
    count<T extends EscalationRouteCountArgs>(
      args?: Subset<T, EscalationRouteCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], EscalationRouteCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a EscalationRoute.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EscalationRouteAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends EscalationRouteAggregateArgs>(args: Subset<T, EscalationRouteAggregateArgs>): Prisma.PrismaPromise<GetEscalationRouteAggregateType<T>>

    /**
     * Group by EscalationRoute.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EscalationRouteGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends EscalationRouteGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: EscalationRouteGroupByArgs['orderBy'] }
        : { orderBy?: EscalationRouteGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, EscalationRouteGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetEscalationRouteGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the EscalationRoute model
   */
  readonly fields: EscalationRouteFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for EscalationRoute.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__EscalationRouteClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    scanRun<T extends ScanRunDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ScanRunDefaultArgs<ExtArgs>>): Prisma__ScanRunClient<$Result.GetResult<Prisma.$ScanRunPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    routeFindings<T extends EscalationRoute$routeFindingsArgs<ExtArgs> = {}>(args?: Subset<T, EscalationRoute$routeFindingsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EscalationRouteFindingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the EscalationRoute model
   */
  interface EscalationRouteFieldRefs {
    readonly id: FieldRef<"EscalationRoute", 'String'>
    readonly scanRunId: FieldRef<"EscalationRoute", 'String'>
    readonly title: FieldRef<"EscalationRoute", 'String'>
    readonly compositeRisk: FieldRef<"EscalationRoute", 'Float'>
    readonly technique: FieldRef<"EscalationRoute", 'String'>
    readonly startTarget: FieldRef<"EscalationRoute", 'String'>
    readonly endTarget: FieldRef<"EscalationRoute", 'String'>
    readonly routeLength: FieldRef<"EscalationRoute", 'Int'>
    readonly confidence: FieldRef<"EscalationRoute", 'Float'>
    readonly narrative: FieldRef<"EscalationRoute", 'String'>
    readonly createdAt: FieldRef<"EscalationRoute", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * EscalationRoute findUnique
   */
  export type EscalationRouteFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRoute
     */
    select?: EscalationRouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRoute
     */
    omit?: EscalationRouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteInclude<ExtArgs> | null
    /**
     * Filter, which EscalationRoute to fetch.
     */
    where: EscalationRouteWhereUniqueInput
  }

  /**
   * EscalationRoute findUniqueOrThrow
   */
  export type EscalationRouteFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRoute
     */
    select?: EscalationRouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRoute
     */
    omit?: EscalationRouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteInclude<ExtArgs> | null
    /**
     * Filter, which EscalationRoute to fetch.
     */
    where: EscalationRouteWhereUniqueInput
  }

  /**
   * EscalationRoute findFirst
   */
  export type EscalationRouteFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRoute
     */
    select?: EscalationRouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRoute
     */
    omit?: EscalationRouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteInclude<ExtArgs> | null
    /**
     * Filter, which EscalationRoute to fetch.
     */
    where?: EscalationRouteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EscalationRoutes to fetch.
     */
    orderBy?: EscalationRouteOrderByWithRelationInput | EscalationRouteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for EscalationRoutes.
     */
    cursor?: EscalationRouteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EscalationRoutes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EscalationRoutes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of EscalationRoutes.
     */
    distinct?: EscalationRouteScalarFieldEnum | EscalationRouteScalarFieldEnum[]
  }

  /**
   * EscalationRoute findFirstOrThrow
   */
  export type EscalationRouteFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRoute
     */
    select?: EscalationRouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRoute
     */
    omit?: EscalationRouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteInclude<ExtArgs> | null
    /**
     * Filter, which EscalationRoute to fetch.
     */
    where?: EscalationRouteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EscalationRoutes to fetch.
     */
    orderBy?: EscalationRouteOrderByWithRelationInput | EscalationRouteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for EscalationRoutes.
     */
    cursor?: EscalationRouteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EscalationRoutes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EscalationRoutes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of EscalationRoutes.
     */
    distinct?: EscalationRouteScalarFieldEnum | EscalationRouteScalarFieldEnum[]
  }

  /**
   * EscalationRoute findMany
   */
  export type EscalationRouteFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRoute
     */
    select?: EscalationRouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRoute
     */
    omit?: EscalationRouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteInclude<ExtArgs> | null
    /**
     * Filter, which EscalationRoutes to fetch.
     */
    where?: EscalationRouteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EscalationRoutes to fetch.
     */
    orderBy?: EscalationRouteOrderByWithRelationInput | EscalationRouteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing EscalationRoutes.
     */
    cursor?: EscalationRouteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EscalationRoutes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EscalationRoutes.
     */
    skip?: number
    distinct?: EscalationRouteScalarFieldEnum | EscalationRouteScalarFieldEnum[]
  }

  /**
   * EscalationRoute create
   */
  export type EscalationRouteCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRoute
     */
    select?: EscalationRouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRoute
     */
    omit?: EscalationRouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteInclude<ExtArgs> | null
    /**
     * The data needed to create a EscalationRoute.
     */
    data: XOR<EscalationRouteCreateInput, EscalationRouteUncheckedCreateInput>
  }

  /**
   * EscalationRoute createMany
   */
  export type EscalationRouteCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many EscalationRoutes.
     */
    data: EscalationRouteCreateManyInput | EscalationRouteCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * EscalationRoute createManyAndReturn
   */
  export type EscalationRouteCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRoute
     */
    select?: EscalationRouteSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRoute
     */
    omit?: EscalationRouteOmit<ExtArgs> | null
    /**
     * The data used to create many EscalationRoutes.
     */
    data: EscalationRouteCreateManyInput | EscalationRouteCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * EscalationRoute update
   */
  export type EscalationRouteUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRoute
     */
    select?: EscalationRouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRoute
     */
    omit?: EscalationRouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteInclude<ExtArgs> | null
    /**
     * The data needed to update a EscalationRoute.
     */
    data: XOR<EscalationRouteUpdateInput, EscalationRouteUncheckedUpdateInput>
    /**
     * Choose, which EscalationRoute to update.
     */
    where: EscalationRouteWhereUniqueInput
  }

  /**
   * EscalationRoute updateMany
   */
  export type EscalationRouteUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update EscalationRoutes.
     */
    data: XOR<EscalationRouteUpdateManyMutationInput, EscalationRouteUncheckedUpdateManyInput>
    /**
     * Filter which EscalationRoutes to update
     */
    where?: EscalationRouteWhereInput
    /**
     * Limit how many EscalationRoutes to update.
     */
    limit?: number
  }

  /**
   * EscalationRoute updateManyAndReturn
   */
  export type EscalationRouteUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRoute
     */
    select?: EscalationRouteSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRoute
     */
    omit?: EscalationRouteOmit<ExtArgs> | null
    /**
     * The data used to update EscalationRoutes.
     */
    data: XOR<EscalationRouteUpdateManyMutationInput, EscalationRouteUncheckedUpdateManyInput>
    /**
     * Filter which EscalationRoutes to update
     */
    where?: EscalationRouteWhereInput
    /**
     * Limit how many EscalationRoutes to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * EscalationRoute upsert
   */
  export type EscalationRouteUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRoute
     */
    select?: EscalationRouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRoute
     */
    omit?: EscalationRouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteInclude<ExtArgs> | null
    /**
     * The filter to search for the EscalationRoute to update in case it exists.
     */
    where: EscalationRouteWhereUniqueInput
    /**
     * In case the EscalationRoute found by the `where` argument doesn't exist, create a new EscalationRoute with this data.
     */
    create: XOR<EscalationRouteCreateInput, EscalationRouteUncheckedCreateInput>
    /**
     * In case the EscalationRoute was found with the provided `where` argument, update it with this data.
     */
    update: XOR<EscalationRouteUpdateInput, EscalationRouteUncheckedUpdateInput>
  }

  /**
   * EscalationRoute delete
   */
  export type EscalationRouteDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRoute
     */
    select?: EscalationRouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRoute
     */
    omit?: EscalationRouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteInclude<ExtArgs> | null
    /**
     * Filter which EscalationRoute to delete.
     */
    where: EscalationRouteWhereUniqueInput
  }

  /**
   * EscalationRoute deleteMany
   */
  export type EscalationRouteDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which EscalationRoutes to delete
     */
    where?: EscalationRouteWhereInput
    /**
     * Limit how many EscalationRoutes to delete.
     */
    limit?: number
  }

  /**
   * EscalationRoute.routeFindings
   */
  export type EscalationRoute$routeFindingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRouteFinding
     */
    select?: EscalationRouteFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRouteFinding
     */
    omit?: EscalationRouteFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteFindingInclude<ExtArgs> | null
    where?: EscalationRouteFindingWhereInput
    orderBy?: EscalationRouteFindingOrderByWithRelationInput | EscalationRouteFindingOrderByWithRelationInput[]
    cursor?: EscalationRouteFindingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: EscalationRouteFindingScalarFieldEnum | EscalationRouteFindingScalarFieldEnum[]
  }

  /**
   * EscalationRoute without action
   */
  export type EscalationRouteDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRoute
     */
    select?: EscalationRouteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRoute
     */
    omit?: EscalationRouteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteInclude<ExtArgs> | null
  }


  /**
   * Model EscalationRouteFinding
   */

  export type AggregateEscalationRouteFinding = {
    _count: EscalationRouteFindingCountAggregateOutputType | null
    _avg: EscalationRouteFindingAvgAggregateOutputType | null
    _sum: EscalationRouteFindingSumAggregateOutputType | null
    _min: EscalationRouteFindingMinAggregateOutputType | null
    _max: EscalationRouteFindingMaxAggregateOutputType | null
  }

  export type EscalationRouteFindingAvgAggregateOutputType = {
    ord: number | null
    linkProbability: number | null
  }

  export type EscalationRouteFindingSumAggregateOutputType = {
    ord: number | null
    linkProbability: number | null
  }

  export type EscalationRouteFindingMinAggregateOutputType = {
    escalationRouteId: string | null
    scanFindingId: string | null
    ord: number | null
    linkProbability: number | null
  }

  export type EscalationRouteFindingMaxAggregateOutputType = {
    escalationRouteId: string | null
    scanFindingId: string | null
    ord: number | null
    linkProbability: number | null
  }

  export type EscalationRouteFindingCountAggregateOutputType = {
    escalationRouteId: number
    scanFindingId: number
    ord: number
    linkProbability: number
    _all: number
  }


  export type EscalationRouteFindingAvgAggregateInputType = {
    ord?: true
    linkProbability?: true
  }

  export type EscalationRouteFindingSumAggregateInputType = {
    ord?: true
    linkProbability?: true
  }

  export type EscalationRouteFindingMinAggregateInputType = {
    escalationRouteId?: true
    scanFindingId?: true
    ord?: true
    linkProbability?: true
  }

  export type EscalationRouteFindingMaxAggregateInputType = {
    escalationRouteId?: true
    scanFindingId?: true
    ord?: true
    linkProbability?: true
  }

  export type EscalationRouteFindingCountAggregateInputType = {
    escalationRouteId?: true
    scanFindingId?: true
    ord?: true
    linkProbability?: true
    _all?: true
  }

  export type EscalationRouteFindingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which EscalationRouteFinding to aggregate.
     */
    where?: EscalationRouteFindingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EscalationRouteFindings to fetch.
     */
    orderBy?: EscalationRouteFindingOrderByWithRelationInput | EscalationRouteFindingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: EscalationRouteFindingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EscalationRouteFindings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EscalationRouteFindings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned EscalationRouteFindings
    **/
    _count?: true | EscalationRouteFindingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: EscalationRouteFindingAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: EscalationRouteFindingSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: EscalationRouteFindingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: EscalationRouteFindingMaxAggregateInputType
  }

  export type GetEscalationRouteFindingAggregateType<T extends EscalationRouteFindingAggregateArgs> = {
        [P in keyof T & keyof AggregateEscalationRouteFinding]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateEscalationRouteFinding[P]>
      : GetScalarType<T[P], AggregateEscalationRouteFinding[P]>
  }




  export type EscalationRouteFindingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EscalationRouteFindingWhereInput
    orderBy?: EscalationRouteFindingOrderByWithAggregationInput | EscalationRouteFindingOrderByWithAggregationInput[]
    by: EscalationRouteFindingScalarFieldEnum[] | EscalationRouteFindingScalarFieldEnum
    having?: EscalationRouteFindingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: EscalationRouteFindingCountAggregateInputType | true
    _avg?: EscalationRouteFindingAvgAggregateInputType
    _sum?: EscalationRouteFindingSumAggregateInputType
    _min?: EscalationRouteFindingMinAggregateInputType
    _max?: EscalationRouteFindingMaxAggregateInputType
  }

  export type EscalationRouteFindingGroupByOutputType = {
    escalationRouteId: string
    scanFindingId: string
    ord: number
    linkProbability: number | null
    _count: EscalationRouteFindingCountAggregateOutputType | null
    _avg: EscalationRouteFindingAvgAggregateOutputType | null
    _sum: EscalationRouteFindingSumAggregateOutputType | null
    _min: EscalationRouteFindingMinAggregateOutputType | null
    _max: EscalationRouteFindingMaxAggregateOutputType | null
  }

  type GetEscalationRouteFindingGroupByPayload<T extends EscalationRouteFindingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<EscalationRouteFindingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof EscalationRouteFindingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], EscalationRouteFindingGroupByOutputType[P]>
            : GetScalarType<T[P], EscalationRouteFindingGroupByOutputType[P]>
        }
      >
    >


  export type EscalationRouteFindingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    escalationRouteId?: boolean
    scanFindingId?: boolean
    ord?: boolean
    linkProbability?: boolean
    escalationRoute?: boolean | EscalationRouteDefaultArgs<ExtArgs>
    scanFinding?: boolean | ScanFindingDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["escalationRouteFinding"]>

  export type EscalationRouteFindingSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    escalationRouteId?: boolean
    scanFindingId?: boolean
    ord?: boolean
    linkProbability?: boolean
    escalationRoute?: boolean | EscalationRouteDefaultArgs<ExtArgs>
    scanFinding?: boolean | ScanFindingDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["escalationRouteFinding"]>

  export type EscalationRouteFindingSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    escalationRouteId?: boolean
    scanFindingId?: boolean
    ord?: boolean
    linkProbability?: boolean
    escalationRoute?: boolean | EscalationRouteDefaultArgs<ExtArgs>
    scanFinding?: boolean | ScanFindingDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["escalationRouteFinding"]>

  export type EscalationRouteFindingSelectScalar = {
    escalationRouteId?: boolean
    scanFindingId?: boolean
    ord?: boolean
    linkProbability?: boolean
  }

  export type EscalationRouteFindingOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"escalationRouteId" | "scanFindingId" | "ord" | "linkProbability", ExtArgs["result"]["escalationRouteFinding"]>
  export type EscalationRouteFindingInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    escalationRoute?: boolean | EscalationRouteDefaultArgs<ExtArgs>
    scanFinding?: boolean | ScanFindingDefaultArgs<ExtArgs>
  }
  export type EscalationRouteFindingIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    escalationRoute?: boolean | EscalationRouteDefaultArgs<ExtArgs>
    scanFinding?: boolean | ScanFindingDefaultArgs<ExtArgs>
  }
  export type EscalationRouteFindingIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    escalationRoute?: boolean | EscalationRouteDefaultArgs<ExtArgs>
    scanFinding?: boolean | ScanFindingDefaultArgs<ExtArgs>
  }

  export type $EscalationRouteFindingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "EscalationRouteFinding"
    objects: {
      escalationRoute: Prisma.$EscalationRoutePayload<ExtArgs>
      scanFinding: Prisma.$ScanFindingPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      escalationRouteId: string
      scanFindingId: string
      ord: number
      linkProbability: number | null
    }, ExtArgs["result"]["escalationRouteFinding"]>
    composites: {}
  }

  type EscalationRouteFindingGetPayload<S extends boolean | null | undefined | EscalationRouteFindingDefaultArgs> = $Result.GetResult<Prisma.$EscalationRouteFindingPayload, S>

  type EscalationRouteFindingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<EscalationRouteFindingFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: EscalationRouteFindingCountAggregateInputType | true
    }

  export interface EscalationRouteFindingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['EscalationRouteFinding'], meta: { name: 'EscalationRouteFinding' } }
    /**
     * Find zero or one EscalationRouteFinding that matches the filter.
     * @param {EscalationRouteFindingFindUniqueArgs} args - Arguments to find a EscalationRouteFinding
     * @example
     * // Get one EscalationRouteFinding
     * const escalationRouteFinding = await prisma.escalationRouteFinding.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends EscalationRouteFindingFindUniqueArgs>(args: SelectSubset<T, EscalationRouteFindingFindUniqueArgs<ExtArgs>>): Prisma__EscalationRouteFindingClient<$Result.GetResult<Prisma.$EscalationRouteFindingPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one EscalationRouteFinding that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {EscalationRouteFindingFindUniqueOrThrowArgs} args - Arguments to find a EscalationRouteFinding
     * @example
     * // Get one EscalationRouteFinding
     * const escalationRouteFinding = await prisma.escalationRouteFinding.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends EscalationRouteFindingFindUniqueOrThrowArgs>(args: SelectSubset<T, EscalationRouteFindingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__EscalationRouteFindingClient<$Result.GetResult<Prisma.$EscalationRouteFindingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first EscalationRouteFinding that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EscalationRouteFindingFindFirstArgs} args - Arguments to find a EscalationRouteFinding
     * @example
     * // Get one EscalationRouteFinding
     * const escalationRouteFinding = await prisma.escalationRouteFinding.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends EscalationRouteFindingFindFirstArgs>(args?: SelectSubset<T, EscalationRouteFindingFindFirstArgs<ExtArgs>>): Prisma__EscalationRouteFindingClient<$Result.GetResult<Prisma.$EscalationRouteFindingPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first EscalationRouteFinding that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EscalationRouteFindingFindFirstOrThrowArgs} args - Arguments to find a EscalationRouteFinding
     * @example
     * // Get one EscalationRouteFinding
     * const escalationRouteFinding = await prisma.escalationRouteFinding.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends EscalationRouteFindingFindFirstOrThrowArgs>(args?: SelectSubset<T, EscalationRouteFindingFindFirstOrThrowArgs<ExtArgs>>): Prisma__EscalationRouteFindingClient<$Result.GetResult<Prisma.$EscalationRouteFindingPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more EscalationRouteFindings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EscalationRouteFindingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all EscalationRouteFindings
     * const escalationRouteFindings = await prisma.escalationRouteFinding.findMany()
     * 
     * // Get first 10 EscalationRouteFindings
     * const escalationRouteFindings = await prisma.escalationRouteFinding.findMany({ take: 10 })
     * 
     * // Only select the `escalationRouteId`
     * const escalationRouteFindingWithEscalationRouteIdOnly = await prisma.escalationRouteFinding.findMany({ select: { escalationRouteId: true } })
     * 
     */
    findMany<T extends EscalationRouteFindingFindManyArgs>(args?: SelectSubset<T, EscalationRouteFindingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EscalationRouteFindingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a EscalationRouteFinding.
     * @param {EscalationRouteFindingCreateArgs} args - Arguments to create a EscalationRouteFinding.
     * @example
     * // Create one EscalationRouteFinding
     * const EscalationRouteFinding = await prisma.escalationRouteFinding.create({
     *   data: {
     *     // ... data to create a EscalationRouteFinding
     *   }
     * })
     * 
     */
    create<T extends EscalationRouteFindingCreateArgs>(args: SelectSubset<T, EscalationRouteFindingCreateArgs<ExtArgs>>): Prisma__EscalationRouteFindingClient<$Result.GetResult<Prisma.$EscalationRouteFindingPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many EscalationRouteFindings.
     * @param {EscalationRouteFindingCreateManyArgs} args - Arguments to create many EscalationRouteFindings.
     * @example
     * // Create many EscalationRouteFindings
     * const escalationRouteFinding = await prisma.escalationRouteFinding.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends EscalationRouteFindingCreateManyArgs>(args?: SelectSubset<T, EscalationRouteFindingCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many EscalationRouteFindings and returns the data saved in the database.
     * @param {EscalationRouteFindingCreateManyAndReturnArgs} args - Arguments to create many EscalationRouteFindings.
     * @example
     * // Create many EscalationRouteFindings
     * const escalationRouteFinding = await prisma.escalationRouteFinding.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many EscalationRouteFindings and only return the `escalationRouteId`
     * const escalationRouteFindingWithEscalationRouteIdOnly = await prisma.escalationRouteFinding.createManyAndReturn({
     *   select: { escalationRouteId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends EscalationRouteFindingCreateManyAndReturnArgs>(args?: SelectSubset<T, EscalationRouteFindingCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EscalationRouteFindingPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a EscalationRouteFinding.
     * @param {EscalationRouteFindingDeleteArgs} args - Arguments to delete one EscalationRouteFinding.
     * @example
     * // Delete one EscalationRouteFinding
     * const EscalationRouteFinding = await prisma.escalationRouteFinding.delete({
     *   where: {
     *     // ... filter to delete one EscalationRouteFinding
     *   }
     * })
     * 
     */
    delete<T extends EscalationRouteFindingDeleteArgs>(args: SelectSubset<T, EscalationRouteFindingDeleteArgs<ExtArgs>>): Prisma__EscalationRouteFindingClient<$Result.GetResult<Prisma.$EscalationRouteFindingPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one EscalationRouteFinding.
     * @param {EscalationRouteFindingUpdateArgs} args - Arguments to update one EscalationRouteFinding.
     * @example
     * // Update one EscalationRouteFinding
     * const escalationRouteFinding = await prisma.escalationRouteFinding.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends EscalationRouteFindingUpdateArgs>(args: SelectSubset<T, EscalationRouteFindingUpdateArgs<ExtArgs>>): Prisma__EscalationRouteFindingClient<$Result.GetResult<Prisma.$EscalationRouteFindingPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more EscalationRouteFindings.
     * @param {EscalationRouteFindingDeleteManyArgs} args - Arguments to filter EscalationRouteFindings to delete.
     * @example
     * // Delete a few EscalationRouteFindings
     * const { count } = await prisma.escalationRouteFinding.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends EscalationRouteFindingDeleteManyArgs>(args?: SelectSubset<T, EscalationRouteFindingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more EscalationRouteFindings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EscalationRouteFindingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many EscalationRouteFindings
     * const escalationRouteFinding = await prisma.escalationRouteFinding.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends EscalationRouteFindingUpdateManyArgs>(args: SelectSubset<T, EscalationRouteFindingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more EscalationRouteFindings and returns the data updated in the database.
     * @param {EscalationRouteFindingUpdateManyAndReturnArgs} args - Arguments to update many EscalationRouteFindings.
     * @example
     * // Update many EscalationRouteFindings
     * const escalationRouteFinding = await prisma.escalationRouteFinding.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more EscalationRouteFindings and only return the `escalationRouteId`
     * const escalationRouteFindingWithEscalationRouteIdOnly = await prisma.escalationRouteFinding.updateManyAndReturn({
     *   select: { escalationRouteId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends EscalationRouteFindingUpdateManyAndReturnArgs>(args: SelectSubset<T, EscalationRouteFindingUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EscalationRouteFindingPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one EscalationRouteFinding.
     * @param {EscalationRouteFindingUpsertArgs} args - Arguments to update or create a EscalationRouteFinding.
     * @example
     * // Update or create a EscalationRouteFinding
     * const escalationRouteFinding = await prisma.escalationRouteFinding.upsert({
     *   create: {
     *     // ... data to create a EscalationRouteFinding
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the EscalationRouteFinding we want to update
     *   }
     * })
     */
    upsert<T extends EscalationRouteFindingUpsertArgs>(args: SelectSubset<T, EscalationRouteFindingUpsertArgs<ExtArgs>>): Prisma__EscalationRouteFindingClient<$Result.GetResult<Prisma.$EscalationRouteFindingPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of EscalationRouteFindings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EscalationRouteFindingCountArgs} args - Arguments to filter EscalationRouteFindings to count.
     * @example
     * // Count the number of EscalationRouteFindings
     * const count = await prisma.escalationRouteFinding.count({
     *   where: {
     *     // ... the filter for the EscalationRouteFindings we want to count
     *   }
     * })
    **/
    count<T extends EscalationRouteFindingCountArgs>(
      args?: Subset<T, EscalationRouteFindingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], EscalationRouteFindingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a EscalationRouteFinding.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EscalationRouteFindingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends EscalationRouteFindingAggregateArgs>(args: Subset<T, EscalationRouteFindingAggregateArgs>): Prisma.PrismaPromise<GetEscalationRouteFindingAggregateType<T>>

    /**
     * Group by EscalationRouteFinding.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EscalationRouteFindingGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends EscalationRouteFindingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: EscalationRouteFindingGroupByArgs['orderBy'] }
        : { orderBy?: EscalationRouteFindingGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, EscalationRouteFindingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetEscalationRouteFindingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the EscalationRouteFinding model
   */
  readonly fields: EscalationRouteFindingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for EscalationRouteFinding.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__EscalationRouteFindingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    escalationRoute<T extends EscalationRouteDefaultArgs<ExtArgs> = {}>(args?: Subset<T, EscalationRouteDefaultArgs<ExtArgs>>): Prisma__EscalationRouteClient<$Result.GetResult<Prisma.$EscalationRoutePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    scanFinding<T extends ScanFindingDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ScanFindingDefaultArgs<ExtArgs>>): Prisma__ScanFindingClient<$Result.GetResult<Prisma.$ScanFindingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the EscalationRouteFinding model
   */
  interface EscalationRouteFindingFieldRefs {
    readonly escalationRouteId: FieldRef<"EscalationRouteFinding", 'String'>
    readonly scanFindingId: FieldRef<"EscalationRouteFinding", 'String'>
    readonly ord: FieldRef<"EscalationRouteFinding", 'Int'>
    readonly linkProbability: FieldRef<"EscalationRouteFinding", 'Float'>
  }
    

  // Custom InputTypes
  /**
   * EscalationRouteFinding findUnique
   */
  export type EscalationRouteFindingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRouteFinding
     */
    select?: EscalationRouteFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRouteFinding
     */
    omit?: EscalationRouteFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteFindingInclude<ExtArgs> | null
    /**
     * Filter, which EscalationRouteFinding to fetch.
     */
    where: EscalationRouteFindingWhereUniqueInput
  }

  /**
   * EscalationRouteFinding findUniqueOrThrow
   */
  export type EscalationRouteFindingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRouteFinding
     */
    select?: EscalationRouteFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRouteFinding
     */
    omit?: EscalationRouteFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteFindingInclude<ExtArgs> | null
    /**
     * Filter, which EscalationRouteFinding to fetch.
     */
    where: EscalationRouteFindingWhereUniqueInput
  }

  /**
   * EscalationRouteFinding findFirst
   */
  export type EscalationRouteFindingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRouteFinding
     */
    select?: EscalationRouteFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRouteFinding
     */
    omit?: EscalationRouteFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteFindingInclude<ExtArgs> | null
    /**
     * Filter, which EscalationRouteFinding to fetch.
     */
    where?: EscalationRouteFindingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EscalationRouteFindings to fetch.
     */
    orderBy?: EscalationRouteFindingOrderByWithRelationInput | EscalationRouteFindingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for EscalationRouteFindings.
     */
    cursor?: EscalationRouteFindingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EscalationRouteFindings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EscalationRouteFindings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of EscalationRouteFindings.
     */
    distinct?: EscalationRouteFindingScalarFieldEnum | EscalationRouteFindingScalarFieldEnum[]
  }

  /**
   * EscalationRouteFinding findFirstOrThrow
   */
  export type EscalationRouteFindingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRouteFinding
     */
    select?: EscalationRouteFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRouteFinding
     */
    omit?: EscalationRouteFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteFindingInclude<ExtArgs> | null
    /**
     * Filter, which EscalationRouteFinding to fetch.
     */
    where?: EscalationRouteFindingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EscalationRouteFindings to fetch.
     */
    orderBy?: EscalationRouteFindingOrderByWithRelationInput | EscalationRouteFindingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for EscalationRouteFindings.
     */
    cursor?: EscalationRouteFindingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EscalationRouteFindings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EscalationRouteFindings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of EscalationRouteFindings.
     */
    distinct?: EscalationRouteFindingScalarFieldEnum | EscalationRouteFindingScalarFieldEnum[]
  }

  /**
   * EscalationRouteFinding findMany
   */
  export type EscalationRouteFindingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRouteFinding
     */
    select?: EscalationRouteFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRouteFinding
     */
    omit?: EscalationRouteFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteFindingInclude<ExtArgs> | null
    /**
     * Filter, which EscalationRouteFindings to fetch.
     */
    where?: EscalationRouteFindingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EscalationRouteFindings to fetch.
     */
    orderBy?: EscalationRouteFindingOrderByWithRelationInput | EscalationRouteFindingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing EscalationRouteFindings.
     */
    cursor?: EscalationRouteFindingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EscalationRouteFindings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EscalationRouteFindings.
     */
    skip?: number
    distinct?: EscalationRouteFindingScalarFieldEnum | EscalationRouteFindingScalarFieldEnum[]
  }

  /**
   * EscalationRouteFinding create
   */
  export type EscalationRouteFindingCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRouteFinding
     */
    select?: EscalationRouteFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRouteFinding
     */
    omit?: EscalationRouteFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteFindingInclude<ExtArgs> | null
    /**
     * The data needed to create a EscalationRouteFinding.
     */
    data: XOR<EscalationRouteFindingCreateInput, EscalationRouteFindingUncheckedCreateInput>
  }

  /**
   * EscalationRouteFinding createMany
   */
  export type EscalationRouteFindingCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many EscalationRouteFindings.
     */
    data: EscalationRouteFindingCreateManyInput | EscalationRouteFindingCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * EscalationRouteFinding createManyAndReturn
   */
  export type EscalationRouteFindingCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRouteFinding
     */
    select?: EscalationRouteFindingSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRouteFinding
     */
    omit?: EscalationRouteFindingOmit<ExtArgs> | null
    /**
     * The data used to create many EscalationRouteFindings.
     */
    data: EscalationRouteFindingCreateManyInput | EscalationRouteFindingCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteFindingIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * EscalationRouteFinding update
   */
  export type EscalationRouteFindingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRouteFinding
     */
    select?: EscalationRouteFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRouteFinding
     */
    omit?: EscalationRouteFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteFindingInclude<ExtArgs> | null
    /**
     * The data needed to update a EscalationRouteFinding.
     */
    data: XOR<EscalationRouteFindingUpdateInput, EscalationRouteFindingUncheckedUpdateInput>
    /**
     * Choose, which EscalationRouteFinding to update.
     */
    where: EscalationRouteFindingWhereUniqueInput
  }

  /**
   * EscalationRouteFinding updateMany
   */
  export type EscalationRouteFindingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update EscalationRouteFindings.
     */
    data: XOR<EscalationRouteFindingUpdateManyMutationInput, EscalationRouteFindingUncheckedUpdateManyInput>
    /**
     * Filter which EscalationRouteFindings to update
     */
    where?: EscalationRouteFindingWhereInput
    /**
     * Limit how many EscalationRouteFindings to update.
     */
    limit?: number
  }

  /**
   * EscalationRouteFinding updateManyAndReturn
   */
  export type EscalationRouteFindingUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRouteFinding
     */
    select?: EscalationRouteFindingSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRouteFinding
     */
    omit?: EscalationRouteFindingOmit<ExtArgs> | null
    /**
     * The data used to update EscalationRouteFindings.
     */
    data: XOR<EscalationRouteFindingUpdateManyMutationInput, EscalationRouteFindingUncheckedUpdateManyInput>
    /**
     * Filter which EscalationRouteFindings to update
     */
    where?: EscalationRouteFindingWhereInput
    /**
     * Limit how many EscalationRouteFindings to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteFindingIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * EscalationRouteFinding upsert
   */
  export type EscalationRouteFindingUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRouteFinding
     */
    select?: EscalationRouteFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRouteFinding
     */
    omit?: EscalationRouteFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteFindingInclude<ExtArgs> | null
    /**
     * The filter to search for the EscalationRouteFinding to update in case it exists.
     */
    where: EscalationRouteFindingWhereUniqueInput
    /**
     * In case the EscalationRouteFinding found by the `where` argument doesn't exist, create a new EscalationRouteFinding with this data.
     */
    create: XOR<EscalationRouteFindingCreateInput, EscalationRouteFindingUncheckedCreateInput>
    /**
     * In case the EscalationRouteFinding was found with the provided `where` argument, update it with this data.
     */
    update: XOR<EscalationRouteFindingUpdateInput, EscalationRouteFindingUncheckedUpdateInput>
  }

  /**
   * EscalationRouteFinding delete
   */
  export type EscalationRouteFindingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRouteFinding
     */
    select?: EscalationRouteFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRouteFinding
     */
    omit?: EscalationRouteFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteFindingInclude<ExtArgs> | null
    /**
     * Filter which EscalationRouteFinding to delete.
     */
    where: EscalationRouteFindingWhereUniqueInput
  }

  /**
   * EscalationRouteFinding deleteMany
   */
  export type EscalationRouteFindingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which EscalationRouteFindings to delete
     */
    where?: EscalationRouteFindingWhereInput
    /**
     * Limit how many EscalationRouteFindings to delete.
     */
    limit?: number
  }

  /**
   * EscalationRouteFinding without action
   */
  export type EscalationRouteFindingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EscalationRouteFinding
     */
    select?: EscalationRouteFindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EscalationRouteFinding
     */
    omit?: EscalationRouteFindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EscalationRouteFindingInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const ApplicationScalarFieldEnum: {
    id: 'id',
    name: 'name',
    baseUrl: 'baseUrl',
    environment: 'environment',
    status: 'status',
    lastScannedAt: 'lastScannedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ApplicationScalarFieldEnum = (typeof ApplicationScalarFieldEnum)[keyof typeof ApplicationScalarFieldEnum]


  export const RuntimeScalarFieldEnum: {
    id: 'id',
    name: 'name',
    serviceType: 'serviceType',
    provider: 'provider',
    environment: 'environment',
    region: 'region',
    status: 'status',
    applicationId: 'applicationId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type RuntimeScalarFieldEnum = (typeof RuntimeScalarFieldEnum)[keyof typeof RuntimeScalarFieldEnum]


  export const AiProviderScalarFieldEnum: {
    id: 'id',
    name: 'name',
    kind: 'kind',
    status: 'status',
    description: 'description',
    baseUrl: 'baseUrl',
    model: 'model',
    apiKey: 'apiKey',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type AiProviderScalarFieldEnum = (typeof AiProviderScalarFieldEnum)[keyof typeof AiProviderScalarFieldEnum]


  export const AiAgentScalarFieldEnum: {
    id: 'id',
    name: 'name',
    status: 'status',
    description: 'description',
    providerId: 'providerId',
    systemPrompt: 'systemPrompt',
    modelOverride: 'modelOverride',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type AiAgentScalarFieldEnum = (typeof AiAgentScalarFieldEnum)[keyof typeof AiAgentScalarFieldEnum]


  export const AiToolScalarFieldEnum: {
    id: 'id',
    name: 'name',
    status: 'status',
    source: 'source',
    description: 'description',
    adapter: 'adapter',
    binary: 'binary',
    category: 'category',
    riskTier: 'riskTier',
    notes: 'notes',
    inputSchema: 'inputSchema',
    outputSchema: 'outputSchema',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type AiToolScalarFieldEnum = (typeof AiToolScalarFieldEnum)[keyof typeof AiToolScalarFieldEnum]


  export const AiAgentToolScalarFieldEnum: {
    agentId: 'agentId',
    toolId: 'toolId',
    ord: 'ord'
  };

  export type AiAgentToolScalarFieldEnum = (typeof AiAgentToolScalarFieldEnum)[keyof typeof AiAgentToolScalarFieldEnum]


  export const ScanRunScalarFieldEnum: {
    id: 'id',
    scope: 'scope',
    status: 'status',
    currentRound: 'currentRound',
    tacticsTotal: 'tacticsTotal',
    tacticsComplete: 'tacticsComplete',
    createdAt: 'createdAt',
    completedAt: 'completedAt'
  };

  export type ScanRunScalarFieldEnum = (typeof ScanRunScalarFieldEnum)[keyof typeof ScanRunScalarFieldEnum]


  export const ScanTacticScalarFieldEnum: {
    id: 'id',
    scanRunId: 'scanRunId',
    target: 'target',
    layer: 'layer',
    service: 'service',
    port: 'port',
    riskScore: 'riskScore',
    status: 'status',
    parentTacticId: 'parentTacticId',
    depth: 'depth',
    createdAt: 'createdAt'
  };

  export type ScanTacticScalarFieldEnum = (typeof ScanTacticScalarFieldEnum)[keyof typeof ScanTacticScalarFieldEnum]


  export const ScanFindingScalarFieldEnum: {
    id: 'id',
    scanRunId: 'scanRunId',
    scanTacticId: 'scanTacticId',
    agentId: 'agentId',
    severity: 'severity',
    confidence: 'confidence',
    title: 'title',
    description: 'description',
    evidence: 'evidence',
    technique: 'technique',
    reproduceCommand: 'reproduceCommand',
    validated: 'validated',
    validationStatus: 'validationStatus',
    evidenceRefs: 'evidenceRefs',
    sourceToolRuns: 'sourceToolRuns',
    confidenceReason: 'confidenceReason',
    createdAt: 'createdAt'
  };

  export type ScanFindingScalarFieldEnum = (typeof ScanFindingScalarFieldEnum)[keyof typeof ScanFindingScalarFieldEnum]


  export const ScanAuditEntryScalarFieldEnum: {
    id: 'id',
    scanRunId: 'scanRunId',
    timestamp: 'timestamp',
    actor: 'actor',
    action: 'action',
    targetTacticId: 'targetTacticId',
    scopeValid: 'scopeValid',
    details: 'details'
  };

  export type ScanAuditEntryScalarFieldEnum = (typeof ScanAuditEntryScalarFieldEnum)[keyof typeof ScanAuditEntryScalarFieldEnum]


  export const EscalationRouteScalarFieldEnum: {
    id: 'id',
    scanRunId: 'scanRunId',
    title: 'title',
    compositeRisk: 'compositeRisk',
    technique: 'technique',
    startTarget: 'startTarget',
    endTarget: 'endTarget',
    routeLength: 'routeLength',
    confidence: 'confidence',
    narrative: 'narrative',
    createdAt: 'createdAt'
  };

  export type EscalationRouteScalarFieldEnum = (typeof EscalationRouteScalarFieldEnum)[keyof typeof EscalationRouteScalarFieldEnum]


  export const EscalationRouteFindingScalarFieldEnum: {
    escalationRouteId: 'escalationRouteId',
    scanFindingId: 'scanFindingId',
    ord: 'ord',
    linkProbability: 'linkProbability'
  };

  export type EscalationRouteFindingScalarFieldEnum = (typeof EscalationRouteFindingScalarFieldEnum)[keyof typeof EscalationRouteFindingScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'ApplicationEnvironment'
   */
  export type EnumApplicationEnvironmentFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ApplicationEnvironment'>
    


  /**
   * Reference to a field of type 'ApplicationEnvironment[]'
   */
  export type ListEnumApplicationEnvironmentFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ApplicationEnvironment[]'>
    


  /**
   * Reference to a field of type 'ApplicationStatus'
   */
  export type EnumApplicationStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ApplicationStatus'>
    


  /**
   * Reference to a field of type 'ApplicationStatus[]'
   */
  export type ListEnumApplicationStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ApplicationStatus[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'RuntimeServiceType'
   */
  export type EnumRuntimeServiceTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RuntimeServiceType'>
    


  /**
   * Reference to a field of type 'RuntimeServiceType[]'
   */
  export type ListEnumRuntimeServiceTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RuntimeServiceType[]'>
    


  /**
   * Reference to a field of type 'RuntimeProvider'
   */
  export type EnumRuntimeProviderFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RuntimeProvider'>
    


  /**
   * Reference to a field of type 'RuntimeProvider[]'
   */
  export type ListEnumRuntimeProviderFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RuntimeProvider[]'>
    


  /**
   * Reference to a field of type 'RuntimeStatus'
   */
  export type EnumRuntimeStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RuntimeStatus'>
    


  /**
   * Reference to a field of type 'RuntimeStatus[]'
   */
  export type ListEnumRuntimeStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RuntimeStatus[]'>
    


  /**
   * Reference to a field of type 'AiProviderKind'
   */
  export type EnumAiProviderKindFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AiProviderKind'>
    


  /**
   * Reference to a field of type 'AiProviderKind[]'
   */
  export type ListEnumAiProviderKindFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AiProviderKind[]'>
    


  /**
   * Reference to a field of type 'AiProviderStatus'
   */
  export type EnumAiProviderStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AiProviderStatus'>
    


  /**
   * Reference to a field of type 'AiProviderStatus[]'
   */
  export type ListEnumAiProviderStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AiProviderStatus[]'>
    


  /**
   * Reference to a field of type 'AiAgentStatus'
   */
  export type EnumAiAgentStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AiAgentStatus'>
    


  /**
   * Reference to a field of type 'AiAgentStatus[]'
   */
  export type ListEnumAiAgentStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AiAgentStatus[]'>
    


  /**
   * Reference to a field of type 'AiToolStatus'
   */
  export type EnumAiToolStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AiToolStatus'>
    


  /**
   * Reference to a field of type 'AiToolStatus[]'
   */
  export type ListEnumAiToolStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AiToolStatus[]'>
    


  /**
   * Reference to a field of type 'AiToolSource'
   */
  export type EnumAiToolSourceFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AiToolSource'>
    


  /**
   * Reference to a field of type 'AiToolSource[]'
   */
  export type ListEnumAiToolSourceFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AiToolSource[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'ScanRunStatus'
   */
  export type EnumScanRunStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ScanRunStatus'>
    


  /**
   * Reference to a field of type 'ScanRunStatus[]'
   */
  export type ListEnumScanRunStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ScanRunStatus[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'ScanTacticStatus'
   */
  export type EnumScanTacticStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ScanTacticStatus'>
    


  /**
   * Reference to a field of type 'ScanTacticStatus[]'
   */
  export type ListEnumScanTacticStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ScanTacticStatus[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    
  /**
   * Deep Input Types
   */


  export type ApplicationWhereInput = {
    AND?: ApplicationWhereInput | ApplicationWhereInput[]
    OR?: ApplicationWhereInput[]
    NOT?: ApplicationWhereInput | ApplicationWhereInput[]
    id?: UuidFilter<"Application"> | string
    name?: StringFilter<"Application"> | string
    baseUrl?: StringNullableFilter<"Application"> | string | null
    environment?: EnumApplicationEnvironmentFilter<"Application"> | $Enums.ApplicationEnvironment
    status?: EnumApplicationStatusFilter<"Application"> | $Enums.ApplicationStatus
    lastScannedAt?: DateTimeNullableFilter<"Application"> | Date | string | null
    createdAt?: DateTimeFilter<"Application"> | Date | string
    updatedAt?: DateTimeFilter<"Application"> | Date | string
    runtimes?: RuntimeListRelationFilter
  }

  export type ApplicationOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    baseUrl?: SortOrderInput | SortOrder
    environment?: SortOrder
    status?: SortOrder
    lastScannedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    runtimes?: RuntimeOrderByRelationAggregateInput
  }

  export type ApplicationWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ApplicationWhereInput | ApplicationWhereInput[]
    OR?: ApplicationWhereInput[]
    NOT?: ApplicationWhereInput | ApplicationWhereInput[]
    name?: StringFilter<"Application"> | string
    baseUrl?: StringNullableFilter<"Application"> | string | null
    environment?: EnumApplicationEnvironmentFilter<"Application"> | $Enums.ApplicationEnvironment
    status?: EnumApplicationStatusFilter<"Application"> | $Enums.ApplicationStatus
    lastScannedAt?: DateTimeNullableFilter<"Application"> | Date | string | null
    createdAt?: DateTimeFilter<"Application"> | Date | string
    updatedAt?: DateTimeFilter<"Application"> | Date | string
    runtimes?: RuntimeListRelationFilter
  }, "id">

  export type ApplicationOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    baseUrl?: SortOrderInput | SortOrder
    environment?: SortOrder
    status?: SortOrder
    lastScannedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ApplicationCountOrderByAggregateInput
    _max?: ApplicationMaxOrderByAggregateInput
    _min?: ApplicationMinOrderByAggregateInput
  }

  export type ApplicationScalarWhereWithAggregatesInput = {
    AND?: ApplicationScalarWhereWithAggregatesInput | ApplicationScalarWhereWithAggregatesInput[]
    OR?: ApplicationScalarWhereWithAggregatesInput[]
    NOT?: ApplicationScalarWhereWithAggregatesInput | ApplicationScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"Application"> | string
    name?: StringWithAggregatesFilter<"Application"> | string
    baseUrl?: StringNullableWithAggregatesFilter<"Application"> | string | null
    environment?: EnumApplicationEnvironmentWithAggregatesFilter<"Application"> | $Enums.ApplicationEnvironment
    status?: EnumApplicationStatusWithAggregatesFilter<"Application"> | $Enums.ApplicationStatus
    lastScannedAt?: DateTimeNullableWithAggregatesFilter<"Application"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Application"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Application"> | Date | string
  }

  export type RuntimeWhereInput = {
    AND?: RuntimeWhereInput | RuntimeWhereInput[]
    OR?: RuntimeWhereInput[]
    NOT?: RuntimeWhereInput | RuntimeWhereInput[]
    id?: UuidFilter<"Runtime"> | string
    name?: StringFilter<"Runtime"> | string
    serviceType?: EnumRuntimeServiceTypeFilter<"Runtime"> | $Enums.RuntimeServiceType
    provider?: EnumRuntimeProviderFilter<"Runtime"> | $Enums.RuntimeProvider
    environment?: EnumApplicationEnvironmentFilter<"Runtime"> | $Enums.ApplicationEnvironment
    region?: StringFilter<"Runtime"> | string
    status?: EnumRuntimeStatusFilter<"Runtime"> | $Enums.RuntimeStatus
    applicationId?: UuidNullableFilter<"Runtime"> | string | null
    createdAt?: DateTimeFilter<"Runtime"> | Date | string
    updatedAt?: DateTimeFilter<"Runtime"> | Date | string
    application?: XOR<ApplicationNullableScalarRelationFilter, ApplicationWhereInput> | null
  }

  export type RuntimeOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    serviceType?: SortOrder
    provider?: SortOrder
    environment?: SortOrder
    region?: SortOrder
    status?: SortOrder
    applicationId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    application?: ApplicationOrderByWithRelationInput
  }

  export type RuntimeWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: RuntimeWhereInput | RuntimeWhereInput[]
    OR?: RuntimeWhereInput[]
    NOT?: RuntimeWhereInput | RuntimeWhereInput[]
    name?: StringFilter<"Runtime"> | string
    serviceType?: EnumRuntimeServiceTypeFilter<"Runtime"> | $Enums.RuntimeServiceType
    provider?: EnumRuntimeProviderFilter<"Runtime"> | $Enums.RuntimeProvider
    environment?: EnumApplicationEnvironmentFilter<"Runtime"> | $Enums.ApplicationEnvironment
    region?: StringFilter<"Runtime"> | string
    status?: EnumRuntimeStatusFilter<"Runtime"> | $Enums.RuntimeStatus
    applicationId?: UuidNullableFilter<"Runtime"> | string | null
    createdAt?: DateTimeFilter<"Runtime"> | Date | string
    updatedAt?: DateTimeFilter<"Runtime"> | Date | string
    application?: XOR<ApplicationNullableScalarRelationFilter, ApplicationWhereInput> | null
  }, "id">

  export type RuntimeOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    serviceType?: SortOrder
    provider?: SortOrder
    environment?: SortOrder
    region?: SortOrder
    status?: SortOrder
    applicationId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: RuntimeCountOrderByAggregateInput
    _max?: RuntimeMaxOrderByAggregateInput
    _min?: RuntimeMinOrderByAggregateInput
  }

  export type RuntimeScalarWhereWithAggregatesInput = {
    AND?: RuntimeScalarWhereWithAggregatesInput | RuntimeScalarWhereWithAggregatesInput[]
    OR?: RuntimeScalarWhereWithAggregatesInput[]
    NOT?: RuntimeScalarWhereWithAggregatesInput | RuntimeScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"Runtime"> | string
    name?: StringWithAggregatesFilter<"Runtime"> | string
    serviceType?: EnumRuntimeServiceTypeWithAggregatesFilter<"Runtime"> | $Enums.RuntimeServiceType
    provider?: EnumRuntimeProviderWithAggregatesFilter<"Runtime"> | $Enums.RuntimeProvider
    environment?: EnumApplicationEnvironmentWithAggregatesFilter<"Runtime"> | $Enums.ApplicationEnvironment
    region?: StringWithAggregatesFilter<"Runtime"> | string
    status?: EnumRuntimeStatusWithAggregatesFilter<"Runtime"> | $Enums.RuntimeStatus
    applicationId?: UuidNullableWithAggregatesFilter<"Runtime"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Runtime"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Runtime"> | Date | string
  }

  export type AiProviderWhereInput = {
    AND?: AiProviderWhereInput | AiProviderWhereInput[]
    OR?: AiProviderWhereInput[]
    NOT?: AiProviderWhereInput | AiProviderWhereInput[]
    id?: UuidFilter<"AiProvider"> | string
    name?: StringFilter<"AiProvider"> | string
    kind?: EnumAiProviderKindFilter<"AiProvider"> | $Enums.AiProviderKind
    status?: EnumAiProviderStatusFilter<"AiProvider"> | $Enums.AiProviderStatus
    description?: StringNullableFilter<"AiProvider"> | string | null
    baseUrl?: StringNullableFilter<"AiProvider"> | string | null
    model?: StringFilter<"AiProvider"> | string
    apiKey?: StringNullableFilter<"AiProvider"> | string | null
    createdAt?: DateTimeFilter<"AiProvider"> | Date | string
    updatedAt?: DateTimeFilter<"AiProvider"> | Date | string
    agents?: AiAgentListRelationFilter
  }

  export type AiProviderOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    kind?: SortOrder
    status?: SortOrder
    description?: SortOrderInput | SortOrder
    baseUrl?: SortOrderInput | SortOrder
    model?: SortOrder
    apiKey?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    agents?: AiAgentOrderByRelationAggregateInput
  }

  export type AiProviderWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AiProviderWhereInput | AiProviderWhereInput[]
    OR?: AiProviderWhereInput[]
    NOT?: AiProviderWhereInput | AiProviderWhereInput[]
    name?: StringFilter<"AiProvider"> | string
    kind?: EnumAiProviderKindFilter<"AiProvider"> | $Enums.AiProviderKind
    status?: EnumAiProviderStatusFilter<"AiProvider"> | $Enums.AiProviderStatus
    description?: StringNullableFilter<"AiProvider"> | string | null
    baseUrl?: StringNullableFilter<"AiProvider"> | string | null
    model?: StringFilter<"AiProvider"> | string
    apiKey?: StringNullableFilter<"AiProvider"> | string | null
    createdAt?: DateTimeFilter<"AiProvider"> | Date | string
    updatedAt?: DateTimeFilter<"AiProvider"> | Date | string
    agents?: AiAgentListRelationFilter
  }, "id">

  export type AiProviderOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    kind?: SortOrder
    status?: SortOrder
    description?: SortOrderInput | SortOrder
    baseUrl?: SortOrderInput | SortOrder
    model?: SortOrder
    apiKey?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: AiProviderCountOrderByAggregateInput
    _max?: AiProviderMaxOrderByAggregateInput
    _min?: AiProviderMinOrderByAggregateInput
  }

  export type AiProviderScalarWhereWithAggregatesInput = {
    AND?: AiProviderScalarWhereWithAggregatesInput | AiProviderScalarWhereWithAggregatesInput[]
    OR?: AiProviderScalarWhereWithAggregatesInput[]
    NOT?: AiProviderScalarWhereWithAggregatesInput | AiProviderScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"AiProvider"> | string
    name?: StringWithAggregatesFilter<"AiProvider"> | string
    kind?: EnumAiProviderKindWithAggregatesFilter<"AiProvider"> | $Enums.AiProviderKind
    status?: EnumAiProviderStatusWithAggregatesFilter<"AiProvider"> | $Enums.AiProviderStatus
    description?: StringNullableWithAggregatesFilter<"AiProvider"> | string | null
    baseUrl?: StringNullableWithAggregatesFilter<"AiProvider"> | string | null
    model?: StringWithAggregatesFilter<"AiProvider"> | string
    apiKey?: StringNullableWithAggregatesFilter<"AiProvider"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"AiProvider"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"AiProvider"> | Date | string
  }

  export type AiAgentWhereInput = {
    AND?: AiAgentWhereInput | AiAgentWhereInput[]
    OR?: AiAgentWhereInput[]
    NOT?: AiAgentWhereInput | AiAgentWhereInput[]
    id?: UuidFilter<"AiAgent"> | string
    name?: StringFilter<"AiAgent"> | string
    status?: EnumAiAgentStatusFilter<"AiAgent"> | $Enums.AiAgentStatus
    description?: StringNullableFilter<"AiAgent"> | string | null
    providerId?: UuidFilter<"AiAgent"> | string
    systemPrompt?: StringFilter<"AiAgent"> | string
    modelOverride?: StringNullableFilter<"AiAgent"> | string | null
    createdAt?: DateTimeFilter<"AiAgent"> | Date | string
    updatedAt?: DateTimeFilter<"AiAgent"> | Date | string
    provider?: XOR<AiProviderScalarRelationFilter, AiProviderWhereInput>
    tools?: AiAgentToolListRelationFilter
  }

  export type AiAgentOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    status?: SortOrder
    description?: SortOrderInput | SortOrder
    providerId?: SortOrder
    systemPrompt?: SortOrder
    modelOverride?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    provider?: AiProviderOrderByWithRelationInput
    tools?: AiAgentToolOrderByRelationAggregateInput
  }

  export type AiAgentWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AiAgentWhereInput | AiAgentWhereInput[]
    OR?: AiAgentWhereInput[]
    NOT?: AiAgentWhereInput | AiAgentWhereInput[]
    name?: StringFilter<"AiAgent"> | string
    status?: EnumAiAgentStatusFilter<"AiAgent"> | $Enums.AiAgentStatus
    description?: StringNullableFilter<"AiAgent"> | string | null
    providerId?: UuidFilter<"AiAgent"> | string
    systemPrompt?: StringFilter<"AiAgent"> | string
    modelOverride?: StringNullableFilter<"AiAgent"> | string | null
    createdAt?: DateTimeFilter<"AiAgent"> | Date | string
    updatedAt?: DateTimeFilter<"AiAgent"> | Date | string
    provider?: XOR<AiProviderScalarRelationFilter, AiProviderWhereInput>
    tools?: AiAgentToolListRelationFilter
  }, "id">

  export type AiAgentOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    status?: SortOrder
    description?: SortOrderInput | SortOrder
    providerId?: SortOrder
    systemPrompt?: SortOrder
    modelOverride?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: AiAgentCountOrderByAggregateInput
    _max?: AiAgentMaxOrderByAggregateInput
    _min?: AiAgentMinOrderByAggregateInput
  }

  export type AiAgentScalarWhereWithAggregatesInput = {
    AND?: AiAgentScalarWhereWithAggregatesInput | AiAgentScalarWhereWithAggregatesInput[]
    OR?: AiAgentScalarWhereWithAggregatesInput[]
    NOT?: AiAgentScalarWhereWithAggregatesInput | AiAgentScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"AiAgent"> | string
    name?: StringWithAggregatesFilter<"AiAgent"> | string
    status?: EnumAiAgentStatusWithAggregatesFilter<"AiAgent"> | $Enums.AiAgentStatus
    description?: StringNullableWithAggregatesFilter<"AiAgent"> | string | null
    providerId?: UuidWithAggregatesFilter<"AiAgent"> | string
    systemPrompt?: StringWithAggregatesFilter<"AiAgent"> | string
    modelOverride?: StringNullableWithAggregatesFilter<"AiAgent"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"AiAgent"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"AiAgent"> | Date | string
  }

  export type AiToolWhereInput = {
    AND?: AiToolWhereInput | AiToolWhereInput[]
    OR?: AiToolWhereInput[]
    NOT?: AiToolWhereInput | AiToolWhereInput[]
    id?: StringFilter<"AiTool"> | string
    name?: StringFilter<"AiTool"> | string
    status?: EnumAiToolStatusFilter<"AiTool"> | $Enums.AiToolStatus
    source?: EnumAiToolSourceFilter<"AiTool"> | $Enums.AiToolSource
    description?: StringNullableFilter<"AiTool"> | string | null
    adapter?: StringNullableFilter<"AiTool"> | string | null
    binary?: StringNullableFilter<"AiTool"> | string | null
    category?: StringFilter<"AiTool"> | string
    riskTier?: StringFilter<"AiTool"> | string
    notes?: StringNullableFilter<"AiTool"> | string | null
    inputSchema?: JsonFilter<"AiTool">
    outputSchema?: JsonFilter<"AiTool">
    createdAt?: DateTimeFilter<"AiTool"> | Date | string
    updatedAt?: DateTimeFilter<"AiTool"> | Date | string
    agents?: AiAgentToolListRelationFilter
  }

  export type AiToolOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    status?: SortOrder
    source?: SortOrder
    description?: SortOrderInput | SortOrder
    adapter?: SortOrderInput | SortOrder
    binary?: SortOrderInput | SortOrder
    category?: SortOrder
    riskTier?: SortOrder
    notes?: SortOrderInput | SortOrder
    inputSchema?: SortOrder
    outputSchema?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    agents?: AiAgentToolOrderByRelationAggregateInput
  }

  export type AiToolWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AiToolWhereInput | AiToolWhereInput[]
    OR?: AiToolWhereInput[]
    NOT?: AiToolWhereInput | AiToolWhereInput[]
    name?: StringFilter<"AiTool"> | string
    status?: EnumAiToolStatusFilter<"AiTool"> | $Enums.AiToolStatus
    source?: EnumAiToolSourceFilter<"AiTool"> | $Enums.AiToolSource
    description?: StringNullableFilter<"AiTool"> | string | null
    adapter?: StringNullableFilter<"AiTool"> | string | null
    binary?: StringNullableFilter<"AiTool"> | string | null
    category?: StringFilter<"AiTool"> | string
    riskTier?: StringFilter<"AiTool"> | string
    notes?: StringNullableFilter<"AiTool"> | string | null
    inputSchema?: JsonFilter<"AiTool">
    outputSchema?: JsonFilter<"AiTool">
    createdAt?: DateTimeFilter<"AiTool"> | Date | string
    updatedAt?: DateTimeFilter<"AiTool"> | Date | string
    agents?: AiAgentToolListRelationFilter
  }, "id">

  export type AiToolOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    status?: SortOrder
    source?: SortOrder
    description?: SortOrderInput | SortOrder
    adapter?: SortOrderInput | SortOrder
    binary?: SortOrderInput | SortOrder
    category?: SortOrder
    riskTier?: SortOrder
    notes?: SortOrderInput | SortOrder
    inputSchema?: SortOrder
    outputSchema?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: AiToolCountOrderByAggregateInput
    _max?: AiToolMaxOrderByAggregateInput
    _min?: AiToolMinOrderByAggregateInput
  }

  export type AiToolScalarWhereWithAggregatesInput = {
    AND?: AiToolScalarWhereWithAggregatesInput | AiToolScalarWhereWithAggregatesInput[]
    OR?: AiToolScalarWhereWithAggregatesInput[]
    NOT?: AiToolScalarWhereWithAggregatesInput | AiToolScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AiTool"> | string
    name?: StringWithAggregatesFilter<"AiTool"> | string
    status?: EnumAiToolStatusWithAggregatesFilter<"AiTool"> | $Enums.AiToolStatus
    source?: EnumAiToolSourceWithAggregatesFilter<"AiTool"> | $Enums.AiToolSource
    description?: StringNullableWithAggregatesFilter<"AiTool"> | string | null
    adapter?: StringNullableWithAggregatesFilter<"AiTool"> | string | null
    binary?: StringNullableWithAggregatesFilter<"AiTool"> | string | null
    category?: StringWithAggregatesFilter<"AiTool"> | string
    riskTier?: StringWithAggregatesFilter<"AiTool"> | string
    notes?: StringNullableWithAggregatesFilter<"AiTool"> | string | null
    inputSchema?: JsonWithAggregatesFilter<"AiTool">
    outputSchema?: JsonWithAggregatesFilter<"AiTool">
    createdAt?: DateTimeWithAggregatesFilter<"AiTool"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"AiTool"> | Date | string
  }

  export type AiAgentToolWhereInput = {
    AND?: AiAgentToolWhereInput | AiAgentToolWhereInput[]
    OR?: AiAgentToolWhereInput[]
    NOT?: AiAgentToolWhereInput | AiAgentToolWhereInput[]
    agentId?: UuidFilter<"AiAgentTool"> | string
    toolId?: StringFilter<"AiAgentTool"> | string
    ord?: IntFilter<"AiAgentTool"> | number
    agent?: XOR<AiAgentScalarRelationFilter, AiAgentWhereInput>
    tool?: XOR<AiToolScalarRelationFilter, AiToolWhereInput>
  }

  export type AiAgentToolOrderByWithRelationInput = {
    agentId?: SortOrder
    toolId?: SortOrder
    ord?: SortOrder
    agent?: AiAgentOrderByWithRelationInput
    tool?: AiToolOrderByWithRelationInput
  }

  export type AiAgentToolWhereUniqueInput = Prisma.AtLeast<{
    agentId_toolId?: AiAgentToolAgentIdToolIdCompoundUniqueInput
    AND?: AiAgentToolWhereInput | AiAgentToolWhereInput[]
    OR?: AiAgentToolWhereInput[]
    NOT?: AiAgentToolWhereInput | AiAgentToolWhereInput[]
    agentId?: UuidFilter<"AiAgentTool"> | string
    toolId?: StringFilter<"AiAgentTool"> | string
    ord?: IntFilter<"AiAgentTool"> | number
    agent?: XOR<AiAgentScalarRelationFilter, AiAgentWhereInput>
    tool?: XOR<AiToolScalarRelationFilter, AiToolWhereInput>
  }, "agentId_toolId">

  export type AiAgentToolOrderByWithAggregationInput = {
    agentId?: SortOrder
    toolId?: SortOrder
    ord?: SortOrder
    _count?: AiAgentToolCountOrderByAggregateInput
    _avg?: AiAgentToolAvgOrderByAggregateInput
    _max?: AiAgentToolMaxOrderByAggregateInput
    _min?: AiAgentToolMinOrderByAggregateInput
    _sum?: AiAgentToolSumOrderByAggregateInput
  }

  export type AiAgentToolScalarWhereWithAggregatesInput = {
    AND?: AiAgentToolScalarWhereWithAggregatesInput | AiAgentToolScalarWhereWithAggregatesInput[]
    OR?: AiAgentToolScalarWhereWithAggregatesInput[]
    NOT?: AiAgentToolScalarWhereWithAggregatesInput | AiAgentToolScalarWhereWithAggregatesInput[]
    agentId?: UuidWithAggregatesFilter<"AiAgentTool"> | string
    toolId?: StringWithAggregatesFilter<"AiAgentTool"> | string
    ord?: IntWithAggregatesFilter<"AiAgentTool"> | number
  }

  export type ScanRunWhereInput = {
    AND?: ScanRunWhereInput | ScanRunWhereInput[]
    OR?: ScanRunWhereInput[]
    NOT?: ScanRunWhereInput | ScanRunWhereInput[]
    id?: UuidFilter<"ScanRun"> | string
    scope?: JsonFilter<"ScanRun">
    status?: EnumScanRunStatusFilter<"ScanRun"> | $Enums.ScanRunStatus
    currentRound?: IntFilter<"ScanRun"> | number
    tacticsTotal?: IntFilter<"ScanRun"> | number
    tacticsComplete?: IntFilter<"ScanRun"> | number
    createdAt?: DateTimeFilter<"ScanRun"> | Date | string
    completedAt?: DateTimeNullableFilter<"ScanRun"> | Date | string | null
    scanTactics?: ScanTacticListRelationFilter
    scanFindings?: ScanFindingListRelationFilter
    scanAuditEntries?: ScanAuditEntryListRelationFilter
    escalationRoutes?: EscalationRouteListRelationFilter
  }

  export type ScanRunOrderByWithRelationInput = {
    id?: SortOrder
    scope?: SortOrder
    status?: SortOrder
    currentRound?: SortOrder
    tacticsTotal?: SortOrder
    tacticsComplete?: SortOrder
    createdAt?: SortOrder
    completedAt?: SortOrderInput | SortOrder
    scanTactics?: ScanTacticOrderByRelationAggregateInput
    scanFindings?: ScanFindingOrderByRelationAggregateInput
    scanAuditEntries?: ScanAuditEntryOrderByRelationAggregateInput
    escalationRoutes?: EscalationRouteOrderByRelationAggregateInput
  }

  export type ScanRunWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ScanRunWhereInput | ScanRunWhereInput[]
    OR?: ScanRunWhereInput[]
    NOT?: ScanRunWhereInput | ScanRunWhereInput[]
    scope?: JsonFilter<"ScanRun">
    status?: EnumScanRunStatusFilter<"ScanRun"> | $Enums.ScanRunStatus
    currentRound?: IntFilter<"ScanRun"> | number
    tacticsTotal?: IntFilter<"ScanRun"> | number
    tacticsComplete?: IntFilter<"ScanRun"> | number
    createdAt?: DateTimeFilter<"ScanRun"> | Date | string
    completedAt?: DateTimeNullableFilter<"ScanRun"> | Date | string | null
    scanTactics?: ScanTacticListRelationFilter
    scanFindings?: ScanFindingListRelationFilter
    scanAuditEntries?: ScanAuditEntryListRelationFilter
    escalationRoutes?: EscalationRouteListRelationFilter
  }, "id">

  export type ScanRunOrderByWithAggregationInput = {
    id?: SortOrder
    scope?: SortOrder
    status?: SortOrder
    currentRound?: SortOrder
    tacticsTotal?: SortOrder
    tacticsComplete?: SortOrder
    createdAt?: SortOrder
    completedAt?: SortOrderInput | SortOrder
    _count?: ScanRunCountOrderByAggregateInput
    _avg?: ScanRunAvgOrderByAggregateInput
    _max?: ScanRunMaxOrderByAggregateInput
    _min?: ScanRunMinOrderByAggregateInput
    _sum?: ScanRunSumOrderByAggregateInput
  }

  export type ScanRunScalarWhereWithAggregatesInput = {
    AND?: ScanRunScalarWhereWithAggregatesInput | ScanRunScalarWhereWithAggregatesInput[]
    OR?: ScanRunScalarWhereWithAggregatesInput[]
    NOT?: ScanRunScalarWhereWithAggregatesInput | ScanRunScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"ScanRun"> | string
    scope?: JsonWithAggregatesFilter<"ScanRun">
    status?: EnumScanRunStatusWithAggregatesFilter<"ScanRun"> | $Enums.ScanRunStatus
    currentRound?: IntWithAggregatesFilter<"ScanRun"> | number
    tacticsTotal?: IntWithAggregatesFilter<"ScanRun"> | number
    tacticsComplete?: IntWithAggregatesFilter<"ScanRun"> | number
    createdAt?: DateTimeWithAggregatesFilter<"ScanRun"> | Date | string
    completedAt?: DateTimeNullableWithAggregatesFilter<"ScanRun"> | Date | string | null
  }

  export type ScanTacticWhereInput = {
    AND?: ScanTacticWhereInput | ScanTacticWhereInput[]
    OR?: ScanTacticWhereInput[]
    NOT?: ScanTacticWhereInput | ScanTacticWhereInput[]
    id?: UuidFilter<"ScanTactic"> | string
    scanRunId?: UuidFilter<"ScanTactic"> | string
    target?: StringFilter<"ScanTactic"> | string
    layer?: StringFilter<"ScanTactic"> | string
    service?: StringNullableFilter<"ScanTactic"> | string | null
    port?: IntNullableFilter<"ScanTactic"> | number | null
    riskScore?: FloatFilter<"ScanTactic"> | number
    status?: EnumScanTacticStatusFilter<"ScanTactic"> | $Enums.ScanTacticStatus
    parentTacticId?: UuidNullableFilter<"ScanTactic"> | string | null
    depth?: IntFilter<"ScanTactic"> | number
    createdAt?: DateTimeFilter<"ScanTactic"> | Date | string
    scanRun?: XOR<ScanRunScalarRelationFilter, ScanRunWhereInput>
    parentTactic?: XOR<ScanTacticNullableScalarRelationFilter, ScanTacticWhereInput> | null
    childTactics?: ScanTacticListRelationFilter
    scanFindings?: ScanFindingListRelationFilter
  }

  export type ScanTacticOrderByWithRelationInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    target?: SortOrder
    layer?: SortOrder
    service?: SortOrderInput | SortOrder
    port?: SortOrderInput | SortOrder
    riskScore?: SortOrder
    status?: SortOrder
    parentTacticId?: SortOrderInput | SortOrder
    depth?: SortOrder
    createdAt?: SortOrder
    scanRun?: ScanRunOrderByWithRelationInput
    parentTactic?: ScanTacticOrderByWithRelationInput
    childTactics?: ScanTacticOrderByRelationAggregateInput
    scanFindings?: ScanFindingOrderByRelationAggregateInput
  }

  export type ScanTacticWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ScanTacticWhereInput | ScanTacticWhereInput[]
    OR?: ScanTacticWhereInput[]
    NOT?: ScanTacticWhereInput | ScanTacticWhereInput[]
    scanRunId?: UuidFilter<"ScanTactic"> | string
    target?: StringFilter<"ScanTactic"> | string
    layer?: StringFilter<"ScanTactic"> | string
    service?: StringNullableFilter<"ScanTactic"> | string | null
    port?: IntNullableFilter<"ScanTactic"> | number | null
    riskScore?: FloatFilter<"ScanTactic"> | number
    status?: EnumScanTacticStatusFilter<"ScanTactic"> | $Enums.ScanTacticStatus
    parentTacticId?: UuidNullableFilter<"ScanTactic"> | string | null
    depth?: IntFilter<"ScanTactic"> | number
    createdAt?: DateTimeFilter<"ScanTactic"> | Date | string
    scanRun?: XOR<ScanRunScalarRelationFilter, ScanRunWhereInput>
    parentTactic?: XOR<ScanTacticNullableScalarRelationFilter, ScanTacticWhereInput> | null
    childTactics?: ScanTacticListRelationFilter
    scanFindings?: ScanFindingListRelationFilter
  }, "id">

  export type ScanTacticOrderByWithAggregationInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    target?: SortOrder
    layer?: SortOrder
    service?: SortOrderInput | SortOrder
    port?: SortOrderInput | SortOrder
    riskScore?: SortOrder
    status?: SortOrder
    parentTacticId?: SortOrderInput | SortOrder
    depth?: SortOrder
    createdAt?: SortOrder
    _count?: ScanTacticCountOrderByAggregateInput
    _avg?: ScanTacticAvgOrderByAggregateInput
    _max?: ScanTacticMaxOrderByAggregateInput
    _min?: ScanTacticMinOrderByAggregateInput
    _sum?: ScanTacticSumOrderByAggregateInput
  }

  export type ScanTacticScalarWhereWithAggregatesInput = {
    AND?: ScanTacticScalarWhereWithAggregatesInput | ScanTacticScalarWhereWithAggregatesInput[]
    OR?: ScanTacticScalarWhereWithAggregatesInput[]
    NOT?: ScanTacticScalarWhereWithAggregatesInput | ScanTacticScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"ScanTactic"> | string
    scanRunId?: UuidWithAggregatesFilter<"ScanTactic"> | string
    target?: StringWithAggregatesFilter<"ScanTactic"> | string
    layer?: StringWithAggregatesFilter<"ScanTactic"> | string
    service?: StringNullableWithAggregatesFilter<"ScanTactic"> | string | null
    port?: IntNullableWithAggregatesFilter<"ScanTactic"> | number | null
    riskScore?: FloatWithAggregatesFilter<"ScanTactic"> | number
    status?: EnumScanTacticStatusWithAggregatesFilter<"ScanTactic"> | $Enums.ScanTacticStatus
    parentTacticId?: UuidNullableWithAggregatesFilter<"ScanTactic"> | string | null
    depth?: IntWithAggregatesFilter<"ScanTactic"> | number
    createdAt?: DateTimeWithAggregatesFilter<"ScanTactic"> | Date | string
  }

  export type ScanFindingWhereInput = {
    AND?: ScanFindingWhereInput | ScanFindingWhereInput[]
    OR?: ScanFindingWhereInput[]
    NOT?: ScanFindingWhereInput | ScanFindingWhereInput[]
    id?: UuidFilter<"ScanFinding"> | string
    scanRunId?: UuidFilter<"ScanFinding"> | string
    scanTacticId?: UuidFilter<"ScanFinding"> | string
    agentId?: StringFilter<"ScanFinding"> | string
    severity?: StringFilter<"ScanFinding"> | string
    confidence?: FloatFilter<"ScanFinding"> | number
    title?: StringFilter<"ScanFinding"> | string
    description?: StringFilter<"ScanFinding"> | string
    evidence?: StringFilter<"ScanFinding"> | string
    technique?: StringFilter<"ScanFinding"> | string
    reproduceCommand?: StringNullableFilter<"ScanFinding"> | string | null
    validated?: BoolFilter<"ScanFinding"> | boolean
    validationStatus?: StringNullableFilter<"ScanFinding"> | string | null
    evidenceRefs?: JsonNullableFilter<"ScanFinding">
    sourceToolRuns?: JsonNullableFilter<"ScanFinding">
    confidenceReason?: StringNullableFilter<"ScanFinding"> | string | null
    createdAt?: DateTimeFilter<"ScanFinding"> | Date | string
    scanRun?: XOR<ScanRunScalarRelationFilter, ScanRunWhereInput>
    scanTactic?: XOR<ScanTacticScalarRelationFilter, ScanTacticWhereInput>
    routeFindings?: EscalationRouteFindingListRelationFilter
  }

  export type ScanFindingOrderByWithRelationInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    scanTacticId?: SortOrder
    agentId?: SortOrder
    severity?: SortOrder
    confidence?: SortOrder
    title?: SortOrder
    description?: SortOrder
    evidence?: SortOrder
    technique?: SortOrder
    reproduceCommand?: SortOrderInput | SortOrder
    validated?: SortOrder
    validationStatus?: SortOrderInput | SortOrder
    evidenceRefs?: SortOrderInput | SortOrder
    sourceToolRuns?: SortOrderInput | SortOrder
    confidenceReason?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    scanRun?: ScanRunOrderByWithRelationInput
    scanTactic?: ScanTacticOrderByWithRelationInput
    routeFindings?: EscalationRouteFindingOrderByRelationAggregateInput
  }

  export type ScanFindingWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ScanFindingWhereInput | ScanFindingWhereInput[]
    OR?: ScanFindingWhereInput[]
    NOT?: ScanFindingWhereInput | ScanFindingWhereInput[]
    scanRunId?: UuidFilter<"ScanFinding"> | string
    scanTacticId?: UuidFilter<"ScanFinding"> | string
    agentId?: StringFilter<"ScanFinding"> | string
    severity?: StringFilter<"ScanFinding"> | string
    confidence?: FloatFilter<"ScanFinding"> | number
    title?: StringFilter<"ScanFinding"> | string
    description?: StringFilter<"ScanFinding"> | string
    evidence?: StringFilter<"ScanFinding"> | string
    technique?: StringFilter<"ScanFinding"> | string
    reproduceCommand?: StringNullableFilter<"ScanFinding"> | string | null
    validated?: BoolFilter<"ScanFinding"> | boolean
    validationStatus?: StringNullableFilter<"ScanFinding"> | string | null
    evidenceRefs?: JsonNullableFilter<"ScanFinding">
    sourceToolRuns?: JsonNullableFilter<"ScanFinding">
    confidenceReason?: StringNullableFilter<"ScanFinding"> | string | null
    createdAt?: DateTimeFilter<"ScanFinding"> | Date | string
    scanRun?: XOR<ScanRunScalarRelationFilter, ScanRunWhereInput>
    scanTactic?: XOR<ScanTacticScalarRelationFilter, ScanTacticWhereInput>
    routeFindings?: EscalationRouteFindingListRelationFilter
  }, "id">

  export type ScanFindingOrderByWithAggregationInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    scanTacticId?: SortOrder
    agentId?: SortOrder
    severity?: SortOrder
    confidence?: SortOrder
    title?: SortOrder
    description?: SortOrder
    evidence?: SortOrder
    technique?: SortOrder
    reproduceCommand?: SortOrderInput | SortOrder
    validated?: SortOrder
    validationStatus?: SortOrderInput | SortOrder
    evidenceRefs?: SortOrderInput | SortOrder
    sourceToolRuns?: SortOrderInput | SortOrder
    confidenceReason?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: ScanFindingCountOrderByAggregateInput
    _avg?: ScanFindingAvgOrderByAggregateInput
    _max?: ScanFindingMaxOrderByAggregateInput
    _min?: ScanFindingMinOrderByAggregateInput
    _sum?: ScanFindingSumOrderByAggregateInput
  }

  export type ScanFindingScalarWhereWithAggregatesInput = {
    AND?: ScanFindingScalarWhereWithAggregatesInput | ScanFindingScalarWhereWithAggregatesInput[]
    OR?: ScanFindingScalarWhereWithAggregatesInput[]
    NOT?: ScanFindingScalarWhereWithAggregatesInput | ScanFindingScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"ScanFinding"> | string
    scanRunId?: UuidWithAggregatesFilter<"ScanFinding"> | string
    scanTacticId?: UuidWithAggregatesFilter<"ScanFinding"> | string
    agentId?: StringWithAggregatesFilter<"ScanFinding"> | string
    severity?: StringWithAggregatesFilter<"ScanFinding"> | string
    confidence?: FloatWithAggregatesFilter<"ScanFinding"> | number
    title?: StringWithAggregatesFilter<"ScanFinding"> | string
    description?: StringWithAggregatesFilter<"ScanFinding"> | string
    evidence?: StringWithAggregatesFilter<"ScanFinding"> | string
    technique?: StringWithAggregatesFilter<"ScanFinding"> | string
    reproduceCommand?: StringNullableWithAggregatesFilter<"ScanFinding"> | string | null
    validated?: BoolWithAggregatesFilter<"ScanFinding"> | boolean
    validationStatus?: StringNullableWithAggregatesFilter<"ScanFinding"> | string | null
    evidenceRefs?: JsonNullableWithAggregatesFilter<"ScanFinding">
    sourceToolRuns?: JsonNullableWithAggregatesFilter<"ScanFinding">
    confidenceReason?: StringNullableWithAggregatesFilter<"ScanFinding"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"ScanFinding"> | Date | string
  }

  export type ScanAuditEntryWhereInput = {
    AND?: ScanAuditEntryWhereInput | ScanAuditEntryWhereInput[]
    OR?: ScanAuditEntryWhereInput[]
    NOT?: ScanAuditEntryWhereInput | ScanAuditEntryWhereInput[]
    id?: UuidFilter<"ScanAuditEntry"> | string
    scanRunId?: UuidFilter<"ScanAuditEntry"> | string
    timestamp?: DateTimeFilter<"ScanAuditEntry"> | Date | string
    actor?: StringFilter<"ScanAuditEntry"> | string
    action?: StringFilter<"ScanAuditEntry"> | string
    targetTacticId?: UuidNullableFilter<"ScanAuditEntry"> | string | null
    scopeValid?: BoolFilter<"ScanAuditEntry"> | boolean
    details?: JsonFilter<"ScanAuditEntry">
    scanRun?: XOR<ScanRunScalarRelationFilter, ScanRunWhereInput>
  }

  export type ScanAuditEntryOrderByWithRelationInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    timestamp?: SortOrder
    actor?: SortOrder
    action?: SortOrder
    targetTacticId?: SortOrderInput | SortOrder
    scopeValid?: SortOrder
    details?: SortOrder
    scanRun?: ScanRunOrderByWithRelationInput
  }

  export type ScanAuditEntryWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ScanAuditEntryWhereInput | ScanAuditEntryWhereInput[]
    OR?: ScanAuditEntryWhereInput[]
    NOT?: ScanAuditEntryWhereInput | ScanAuditEntryWhereInput[]
    scanRunId?: UuidFilter<"ScanAuditEntry"> | string
    timestamp?: DateTimeFilter<"ScanAuditEntry"> | Date | string
    actor?: StringFilter<"ScanAuditEntry"> | string
    action?: StringFilter<"ScanAuditEntry"> | string
    targetTacticId?: UuidNullableFilter<"ScanAuditEntry"> | string | null
    scopeValid?: BoolFilter<"ScanAuditEntry"> | boolean
    details?: JsonFilter<"ScanAuditEntry">
    scanRun?: XOR<ScanRunScalarRelationFilter, ScanRunWhereInput>
  }, "id">

  export type ScanAuditEntryOrderByWithAggregationInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    timestamp?: SortOrder
    actor?: SortOrder
    action?: SortOrder
    targetTacticId?: SortOrderInput | SortOrder
    scopeValid?: SortOrder
    details?: SortOrder
    _count?: ScanAuditEntryCountOrderByAggregateInput
    _max?: ScanAuditEntryMaxOrderByAggregateInput
    _min?: ScanAuditEntryMinOrderByAggregateInput
  }

  export type ScanAuditEntryScalarWhereWithAggregatesInput = {
    AND?: ScanAuditEntryScalarWhereWithAggregatesInput | ScanAuditEntryScalarWhereWithAggregatesInput[]
    OR?: ScanAuditEntryScalarWhereWithAggregatesInput[]
    NOT?: ScanAuditEntryScalarWhereWithAggregatesInput | ScanAuditEntryScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"ScanAuditEntry"> | string
    scanRunId?: UuidWithAggregatesFilter<"ScanAuditEntry"> | string
    timestamp?: DateTimeWithAggregatesFilter<"ScanAuditEntry"> | Date | string
    actor?: StringWithAggregatesFilter<"ScanAuditEntry"> | string
    action?: StringWithAggregatesFilter<"ScanAuditEntry"> | string
    targetTacticId?: UuidNullableWithAggregatesFilter<"ScanAuditEntry"> | string | null
    scopeValid?: BoolWithAggregatesFilter<"ScanAuditEntry"> | boolean
    details?: JsonWithAggregatesFilter<"ScanAuditEntry">
  }

  export type EscalationRouteWhereInput = {
    AND?: EscalationRouteWhereInput | EscalationRouteWhereInput[]
    OR?: EscalationRouteWhereInput[]
    NOT?: EscalationRouteWhereInput | EscalationRouteWhereInput[]
    id?: UuidFilter<"EscalationRoute"> | string
    scanRunId?: UuidFilter<"EscalationRoute"> | string
    title?: StringFilter<"EscalationRoute"> | string
    compositeRisk?: FloatFilter<"EscalationRoute"> | number
    technique?: StringFilter<"EscalationRoute"> | string
    startTarget?: StringFilter<"EscalationRoute"> | string
    endTarget?: StringFilter<"EscalationRoute"> | string
    routeLength?: IntFilter<"EscalationRoute"> | number
    confidence?: FloatFilter<"EscalationRoute"> | number
    narrative?: StringNullableFilter<"EscalationRoute"> | string | null
    createdAt?: DateTimeFilter<"EscalationRoute"> | Date | string
    scanRun?: XOR<ScanRunScalarRelationFilter, ScanRunWhereInput>
    routeFindings?: EscalationRouteFindingListRelationFilter
  }

  export type EscalationRouteOrderByWithRelationInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    title?: SortOrder
    compositeRisk?: SortOrder
    technique?: SortOrder
    startTarget?: SortOrder
    endTarget?: SortOrder
    routeLength?: SortOrder
    confidence?: SortOrder
    narrative?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    scanRun?: ScanRunOrderByWithRelationInput
    routeFindings?: EscalationRouteFindingOrderByRelationAggregateInput
  }

  export type EscalationRouteWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: EscalationRouteWhereInput | EscalationRouteWhereInput[]
    OR?: EscalationRouteWhereInput[]
    NOT?: EscalationRouteWhereInput | EscalationRouteWhereInput[]
    scanRunId?: UuidFilter<"EscalationRoute"> | string
    title?: StringFilter<"EscalationRoute"> | string
    compositeRisk?: FloatFilter<"EscalationRoute"> | number
    technique?: StringFilter<"EscalationRoute"> | string
    startTarget?: StringFilter<"EscalationRoute"> | string
    endTarget?: StringFilter<"EscalationRoute"> | string
    routeLength?: IntFilter<"EscalationRoute"> | number
    confidence?: FloatFilter<"EscalationRoute"> | number
    narrative?: StringNullableFilter<"EscalationRoute"> | string | null
    createdAt?: DateTimeFilter<"EscalationRoute"> | Date | string
    scanRun?: XOR<ScanRunScalarRelationFilter, ScanRunWhereInput>
    routeFindings?: EscalationRouteFindingListRelationFilter
  }, "id">

  export type EscalationRouteOrderByWithAggregationInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    title?: SortOrder
    compositeRisk?: SortOrder
    technique?: SortOrder
    startTarget?: SortOrder
    endTarget?: SortOrder
    routeLength?: SortOrder
    confidence?: SortOrder
    narrative?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: EscalationRouteCountOrderByAggregateInput
    _avg?: EscalationRouteAvgOrderByAggregateInput
    _max?: EscalationRouteMaxOrderByAggregateInput
    _min?: EscalationRouteMinOrderByAggregateInput
    _sum?: EscalationRouteSumOrderByAggregateInput
  }

  export type EscalationRouteScalarWhereWithAggregatesInput = {
    AND?: EscalationRouteScalarWhereWithAggregatesInput | EscalationRouteScalarWhereWithAggregatesInput[]
    OR?: EscalationRouteScalarWhereWithAggregatesInput[]
    NOT?: EscalationRouteScalarWhereWithAggregatesInput | EscalationRouteScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"EscalationRoute"> | string
    scanRunId?: UuidWithAggregatesFilter<"EscalationRoute"> | string
    title?: StringWithAggregatesFilter<"EscalationRoute"> | string
    compositeRisk?: FloatWithAggregatesFilter<"EscalationRoute"> | number
    technique?: StringWithAggregatesFilter<"EscalationRoute"> | string
    startTarget?: StringWithAggregatesFilter<"EscalationRoute"> | string
    endTarget?: StringWithAggregatesFilter<"EscalationRoute"> | string
    routeLength?: IntWithAggregatesFilter<"EscalationRoute"> | number
    confidence?: FloatWithAggregatesFilter<"EscalationRoute"> | number
    narrative?: StringNullableWithAggregatesFilter<"EscalationRoute"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"EscalationRoute"> | Date | string
  }

  export type EscalationRouteFindingWhereInput = {
    AND?: EscalationRouteFindingWhereInput | EscalationRouteFindingWhereInput[]
    OR?: EscalationRouteFindingWhereInput[]
    NOT?: EscalationRouteFindingWhereInput | EscalationRouteFindingWhereInput[]
    escalationRouteId?: UuidFilter<"EscalationRouteFinding"> | string
    scanFindingId?: UuidFilter<"EscalationRouteFinding"> | string
    ord?: IntFilter<"EscalationRouteFinding"> | number
    linkProbability?: FloatNullableFilter<"EscalationRouteFinding"> | number | null
    escalationRoute?: XOR<EscalationRouteScalarRelationFilter, EscalationRouteWhereInput>
    scanFinding?: XOR<ScanFindingScalarRelationFilter, ScanFindingWhereInput>
  }

  export type EscalationRouteFindingOrderByWithRelationInput = {
    escalationRouteId?: SortOrder
    scanFindingId?: SortOrder
    ord?: SortOrder
    linkProbability?: SortOrderInput | SortOrder
    escalationRoute?: EscalationRouteOrderByWithRelationInput
    scanFinding?: ScanFindingOrderByWithRelationInput
  }

  export type EscalationRouteFindingWhereUniqueInput = Prisma.AtLeast<{
    escalationRouteId_scanFindingId_ord?: EscalationRouteFindingEscalationRouteIdScanFindingIdOrdCompoundUniqueInput
    AND?: EscalationRouteFindingWhereInput | EscalationRouteFindingWhereInput[]
    OR?: EscalationRouteFindingWhereInput[]
    NOT?: EscalationRouteFindingWhereInput | EscalationRouteFindingWhereInput[]
    escalationRouteId?: UuidFilter<"EscalationRouteFinding"> | string
    scanFindingId?: UuidFilter<"EscalationRouteFinding"> | string
    ord?: IntFilter<"EscalationRouteFinding"> | number
    linkProbability?: FloatNullableFilter<"EscalationRouteFinding"> | number | null
    escalationRoute?: XOR<EscalationRouteScalarRelationFilter, EscalationRouteWhereInput>
    scanFinding?: XOR<ScanFindingScalarRelationFilter, ScanFindingWhereInput>
  }, "escalationRouteId_scanFindingId_ord">

  export type EscalationRouteFindingOrderByWithAggregationInput = {
    escalationRouteId?: SortOrder
    scanFindingId?: SortOrder
    ord?: SortOrder
    linkProbability?: SortOrderInput | SortOrder
    _count?: EscalationRouteFindingCountOrderByAggregateInput
    _avg?: EscalationRouteFindingAvgOrderByAggregateInput
    _max?: EscalationRouteFindingMaxOrderByAggregateInput
    _min?: EscalationRouteFindingMinOrderByAggregateInput
    _sum?: EscalationRouteFindingSumOrderByAggregateInput
  }

  export type EscalationRouteFindingScalarWhereWithAggregatesInput = {
    AND?: EscalationRouteFindingScalarWhereWithAggregatesInput | EscalationRouteFindingScalarWhereWithAggregatesInput[]
    OR?: EscalationRouteFindingScalarWhereWithAggregatesInput[]
    NOT?: EscalationRouteFindingScalarWhereWithAggregatesInput | EscalationRouteFindingScalarWhereWithAggregatesInput[]
    escalationRouteId?: UuidWithAggregatesFilter<"EscalationRouteFinding"> | string
    scanFindingId?: UuidWithAggregatesFilter<"EscalationRouteFinding"> | string
    ord?: IntWithAggregatesFilter<"EscalationRouteFinding"> | number
    linkProbability?: FloatNullableWithAggregatesFilter<"EscalationRouteFinding"> | number | null
  }

  export type ApplicationCreateInput = {
    id: string
    name: string
    baseUrl?: string | null
    environment: $Enums.ApplicationEnvironment
    status: $Enums.ApplicationStatus
    lastScannedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    runtimes?: RuntimeCreateNestedManyWithoutApplicationInput
  }

  export type ApplicationUncheckedCreateInput = {
    id: string
    name: string
    baseUrl?: string | null
    environment: $Enums.ApplicationEnvironment
    status: $Enums.ApplicationStatus
    lastScannedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    runtimes?: RuntimeUncheckedCreateNestedManyWithoutApplicationInput
  }

  export type ApplicationUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    environment?: EnumApplicationEnvironmentFieldUpdateOperationsInput | $Enums.ApplicationEnvironment
    status?: EnumApplicationStatusFieldUpdateOperationsInput | $Enums.ApplicationStatus
    lastScannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    runtimes?: RuntimeUpdateManyWithoutApplicationNestedInput
  }

  export type ApplicationUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    environment?: EnumApplicationEnvironmentFieldUpdateOperationsInput | $Enums.ApplicationEnvironment
    status?: EnumApplicationStatusFieldUpdateOperationsInput | $Enums.ApplicationStatus
    lastScannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    runtimes?: RuntimeUncheckedUpdateManyWithoutApplicationNestedInput
  }

  export type ApplicationCreateManyInput = {
    id: string
    name: string
    baseUrl?: string | null
    environment: $Enums.ApplicationEnvironment
    status: $Enums.ApplicationStatus
    lastScannedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ApplicationUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    environment?: EnumApplicationEnvironmentFieldUpdateOperationsInput | $Enums.ApplicationEnvironment
    status?: EnumApplicationStatusFieldUpdateOperationsInput | $Enums.ApplicationStatus
    lastScannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApplicationUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    environment?: EnumApplicationEnvironmentFieldUpdateOperationsInput | $Enums.ApplicationEnvironment
    status?: EnumApplicationStatusFieldUpdateOperationsInput | $Enums.ApplicationStatus
    lastScannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RuntimeCreateInput = {
    id: string
    name: string
    serviceType: $Enums.RuntimeServiceType
    provider: $Enums.RuntimeProvider
    environment: $Enums.ApplicationEnvironment
    region: string
    status: $Enums.RuntimeStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    application?: ApplicationCreateNestedOneWithoutRuntimesInput
  }

  export type RuntimeUncheckedCreateInput = {
    id: string
    name: string
    serviceType: $Enums.RuntimeServiceType
    provider: $Enums.RuntimeProvider
    environment: $Enums.ApplicationEnvironment
    region: string
    status: $Enums.RuntimeStatus
    applicationId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RuntimeUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    serviceType?: EnumRuntimeServiceTypeFieldUpdateOperationsInput | $Enums.RuntimeServiceType
    provider?: EnumRuntimeProviderFieldUpdateOperationsInput | $Enums.RuntimeProvider
    environment?: EnumApplicationEnvironmentFieldUpdateOperationsInput | $Enums.ApplicationEnvironment
    region?: StringFieldUpdateOperationsInput | string
    status?: EnumRuntimeStatusFieldUpdateOperationsInput | $Enums.RuntimeStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    application?: ApplicationUpdateOneWithoutRuntimesNestedInput
  }

  export type RuntimeUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    serviceType?: EnumRuntimeServiceTypeFieldUpdateOperationsInput | $Enums.RuntimeServiceType
    provider?: EnumRuntimeProviderFieldUpdateOperationsInput | $Enums.RuntimeProvider
    environment?: EnumApplicationEnvironmentFieldUpdateOperationsInput | $Enums.ApplicationEnvironment
    region?: StringFieldUpdateOperationsInput | string
    status?: EnumRuntimeStatusFieldUpdateOperationsInput | $Enums.RuntimeStatus
    applicationId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RuntimeCreateManyInput = {
    id: string
    name: string
    serviceType: $Enums.RuntimeServiceType
    provider: $Enums.RuntimeProvider
    environment: $Enums.ApplicationEnvironment
    region: string
    status: $Enums.RuntimeStatus
    applicationId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RuntimeUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    serviceType?: EnumRuntimeServiceTypeFieldUpdateOperationsInput | $Enums.RuntimeServiceType
    provider?: EnumRuntimeProviderFieldUpdateOperationsInput | $Enums.RuntimeProvider
    environment?: EnumApplicationEnvironmentFieldUpdateOperationsInput | $Enums.ApplicationEnvironment
    region?: StringFieldUpdateOperationsInput | string
    status?: EnumRuntimeStatusFieldUpdateOperationsInput | $Enums.RuntimeStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RuntimeUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    serviceType?: EnumRuntimeServiceTypeFieldUpdateOperationsInput | $Enums.RuntimeServiceType
    provider?: EnumRuntimeProviderFieldUpdateOperationsInput | $Enums.RuntimeProvider
    environment?: EnumApplicationEnvironmentFieldUpdateOperationsInput | $Enums.ApplicationEnvironment
    region?: StringFieldUpdateOperationsInput | string
    status?: EnumRuntimeStatusFieldUpdateOperationsInput | $Enums.RuntimeStatus
    applicationId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiProviderCreateInput = {
    id: string
    name: string
    kind: $Enums.AiProviderKind
    status: $Enums.AiProviderStatus
    description?: string | null
    baseUrl?: string | null
    model: string
    apiKey?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    agents?: AiAgentCreateNestedManyWithoutProviderInput
  }

  export type AiProviderUncheckedCreateInput = {
    id: string
    name: string
    kind: $Enums.AiProviderKind
    status: $Enums.AiProviderStatus
    description?: string | null
    baseUrl?: string | null
    model: string
    apiKey?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    agents?: AiAgentUncheckedCreateNestedManyWithoutProviderInput
  }

  export type AiProviderUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    kind?: EnumAiProviderKindFieldUpdateOperationsInput | $Enums.AiProviderKind
    status?: EnumAiProviderStatusFieldUpdateOperationsInput | $Enums.AiProviderStatus
    description?: NullableStringFieldUpdateOperationsInput | string | null
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model?: StringFieldUpdateOperationsInput | string
    apiKey?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    agents?: AiAgentUpdateManyWithoutProviderNestedInput
  }

  export type AiProviderUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    kind?: EnumAiProviderKindFieldUpdateOperationsInput | $Enums.AiProviderKind
    status?: EnumAiProviderStatusFieldUpdateOperationsInput | $Enums.AiProviderStatus
    description?: NullableStringFieldUpdateOperationsInput | string | null
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model?: StringFieldUpdateOperationsInput | string
    apiKey?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    agents?: AiAgentUncheckedUpdateManyWithoutProviderNestedInput
  }

  export type AiProviderCreateManyInput = {
    id: string
    name: string
    kind: $Enums.AiProviderKind
    status: $Enums.AiProviderStatus
    description?: string | null
    baseUrl?: string | null
    model: string
    apiKey?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AiProviderUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    kind?: EnumAiProviderKindFieldUpdateOperationsInput | $Enums.AiProviderKind
    status?: EnumAiProviderStatusFieldUpdateOperationsInput | $Enums.AiProviderStatus
    description?: NullableStringFieldUpdateOperationsInput | string | null
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model?: StringFieldUpdateOperationsInput | string
    apiKey?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiProviderUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    kind?: EnumAiProviderKindFieldUpdateOperationsInput | $Enums.AiProviderKind
    status?: EnumAiProviderStatusFieldUpdateOperationsInput | $Enums.AiProviderStatus
    description?: NullableStringFieldUpdateOperationsInput | string | null
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model?: StringFieldUpdateOperationsInput | string
    apiKey?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiAgentCreateInput = {
    id: string
    name: string
    status: $Enums.AiAgentStatus
    description?: string | null
    systemPrompt: string
    modelOverride?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    provider: AiProviderCreateNestedOneWithoutAgentsInput
    tools?: AiAgentToolCreateNestedManyWithoutAgentInput
  }

  export type AiAgentUncheckedCreateInput = {
    id: string
    name: string
    status: $Enums.AiAgentStatus
    description?: string | null
    providerId: string
    systemPrompt: string
    modelOverride?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tools?: AiAgentToolUncheckedCreateNestedManyWithoutAgentInput
  }

  export type AiAgentUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    status?: EnumAiAgentStatusFieldUpdateOperationsInput | $Enums.AiAgentStatus
    description?: NullableStringFieldUpdateOperationsInput | string | null
    systemPrompt?: StringFieldUpdateOperationsInput | string
    modelOverride?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    provider?: AiProviderUpdateOneRequiredWithoutAgentsNestedInput
    tools?: AiAgentToolUpdateManyWithoutAgentNestedInput
  }

  export type AiAgentUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    status?: EnumAiAgentStatusFieldUpdateOperationsInput | $Enums.AiAgentStatus
    description?: NullableStringFieldUpdateOperationsInput | string | null
    providerId?: StringFieldUpdateOperationsInput | string
    systemPrompt?: StringFieldUpdateOperationsInput | string
    modelOverride?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tools?: AiAgentToolUncheckedUpdateManyWithoutAgentNestedInput
  }

  export type AiAgentCreateManyInput = {
    id: string
    name: string
    status: $Enums.AiAgentStatus
    description?: string | null
    providerId: string
    systemPrompt: string
    modelOverride?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AiAgentUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    status?: EnumAiAgentStatusFieldUpdateOperationsInput | $Enums.AiAgentStatus
    description?: NullableStringFieldUpdateOperationsInput | string | null
    systemPrompt?: StringFieldUpdateOperationsInput | string
    modelOverride?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiAgentUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    status?: EnumAiAgentStatusFieldUpdateOperationsInput | $Enums.AiAgentStatus
    description?: NullableStringFieldUpdateOperationsInput | string | null
    providerId?: StringFieldUpdateOperationsInput | string
    systemPrompt?: StringFieldUpdateOperationsInput | string
    modelOverride?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiToolCreateInput = {
    id: string
    name: string
    status: $Enums.AiToolStatus
    source: $Enums.AiToolSource
    description?: string | null
    adapter?: string | null
    binary?: string | null
    category: string
    riskTier: string
    notes?: string | null
    inputSchema: JsonNullValueInput | InputJsonValue
    outputSchema: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    agents?: AiAgentToolCreateNestedManyWithoutToolInput
  }

  export type AiToolUncheckedCreateInput = {
    id: string
    name: string
    status: $Enums.AiToolStatus
    source: $Enums.AiToolSource
    description?: string | null
    adapter?: string | null
    binary?: string | null
    category: string
    riskTier: string
    notes?: string | null
    inputSchema: JsonNullValueInput | InputJsonValue
    outputSchema: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    agents?: AiAgentToolUncheckedCreateNestedManyWithoutToolInput
  }

  export type AiToolUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    status?: EnumAiToolStatusFieldUpdateOperationsInput | $Enums.AiToolStatus
    source?: EnumAiToolSourceFieldUpdateOperationsInput | $Enums.AiToolSource
    description?: NullableStringFieldUpdateOperationsInput | string | null
    adapter?: NullableStringFieldUpdateOperationsInput | string | null
    binary?: NullableStringFieldUpdateOperationsInput | string | null
    category?: StringFieldUpdateOperationsInput | string
    riskTier?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    inputSchema?: JsonNullValueInput | InputJsonValue
    outputSchema?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    agents?: AiAgentToolUpdateManyWithoutToolNestedInput
  }

  export type AiToolUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    status?: EnumAiToolStatusFieldUpdateOperationsInput | $Enums.AiToolStatus
    source?: EnumAiToolSourceFieldUpdateOperationsInput | $Enums.AiToolSource
    description?: NullableStringFieldUpdateOperationsInput | string | null
    adapter?: NullableStringFieldUpdateOperationsInput | string | null
    binary?: NullableStringFieldUpdateOperationsInput | string | null
    category?: StringFieldUpdateOperationsInput | string
    riskTier?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    inputSchema?: JsonNullValueInput | InputJsonValue
    outputSchema?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    agents?: AiAgentToolUncheckedUpdateManyWithoutToolNestedInput
  }

  export type AiToolCreateManyInput = {
    id: string
    name: string
    status: $Enums.AiToolStatus
    source: $Enums.AiToolSource
    description?: string | null
    adapter?: string | null
    binary?: string | null
    category: string
    riskTier: string
    notes?: string | null
    inputSchema: JsonNullValueInput | InputJsonValue
    outputSchema: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AiToolUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    status?: EnumAiToolStatusFieldUpdateOperationsInput | $Enums.AiToolStatus
    source?: EnumAiToolSourceFieldUpdateOperationsInput | $Enums.AiToolSource
    description?: NullableStringFieldUpdateOperationsInput | string | null
    adapter?: NullableStringFieldUpdateOperationsInput | string | null
    binary?: NullableStringFieldUpdateOperationsInput | string | null
    category?: StringFieldUpdateOperationsInput | string
    riskTier?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    inputSchema?: JsonNullValueInput | InputJsonValue
    outputSchema?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiToolUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    status?: EnumAiToolStatusFieldUpdateOperationsInput | $Enums.AiToolStatus
    source?: EnumAiToolSourceFieldUpdateOperationsInput | $Enums.AiToolSource
    description?: NullableStringFieldUpdateOperationsInput | string | null
    adapter?: NullableStringFieldUpdateOperationsInput | string | null
    binary?: NullableStringFieldUpdateOperationsInput | string | null
    category?: StringFieldUpdateOperationsInput | string
    riskTier?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    inputSchema?: JsonNullValueInput | InputJsonValue
    outputSchema?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiAgentToolCreateInput = {
    ord: number
    agent: AiAgentCreateNestedOneWithoutToolsInput
    tool: AiToolCreateNestedOneWithoutAgentsInput
  }

  export type AiAgentToolUncheckedCreateInput = {
    agentId: string
    toolId: string
    ord: number
  }

  export type AiAgentToolUpdateInput = {
    ord?: IntFieldUpdateOperationsInput | number
    agent?: AiAgentUpdateOneRequiredWithoutToolsNestedInput
    tool?: AiToolUpdateOneRequiredWithoutAgentsNestedInput
  }

  export type AiAgentToolUncheckedUpdateInput = {
    agentId?: StringFieldUpdateOperationsInput | string
    toolId?: StringFieldUpdateOperationsInput | string
    ord?: IntFieldUpdateOperationsInput | number
  }

  export type AiAgentToolCreateManyInput = {
    agentId: string
    toolId: string
    ord: number
  }

  export type AiAgentToolUpdateManyMutationInput = {
    ord?: IntFieldUpdateOperationsInput | number
  }

  export type AiAgentToolUncheckedUpdateManyInput = {
    agentId?: StringFieldUpdateOperationsInput | string
    toolId?: StringFieldUpdateOperationsInput | string
    ord?: IntFieldUpdateOperationsInput | number
  }

  export type ScanRunCreateInput = {
    id: string
    scope: JsonNullValueInput | InputJsonValue
    status: $Enums.ScanRunStatus
    currentRound?: number
    tacticsTotal?: number
    tacticsComplete?: number
    createdAt?: Date | string
    completedAt?: Date | string | null
    scanTactics?: ScanTacticCreateNestedManyWithoutScanRunInput
    scanFindings?: ScanFindingCreateNestedManyWithoutScanRunInput
    scanAuditEntries?: ScanAuditEntryCreateNestedManyWithoutScanRunInput
    escalationRoutes?: EscalationRouteCreateNestedManyWithoutScanRunInput
  }

  export type ScanRunUncheckedCreateInput = {
    id: string
    scope: JsonNullValueInput | InputJsonValue
    status: $Enums.ScanRunStatus
    currentRound?: number
    tacticsTotal?: number
    tacticsComplete?: number
    createdAt?: Date | string
    completedAt?: Date | string | null
    scanTactics?: ScanTacticUncheckedCreateNestedManyWithoutScanRunInput
    scanFindings?: ScanFindingUncheckedCreateNestedManyWithoutScanRunInput
    scanAuditEntries?: ScanAuditEntryUncheckedCreateNestedManyWithoutScanRunInput
    escalationRoutes?: EscalationRouteUncheckedCreateNestedManyWithoutScanRunInput
  }

  export type ScanRunUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    scope?: JsonNullValueInput | InputJsonValue
    status?: EnumScanRunStatusFieldUpdateOperationsInput | $Enums.ScanRunStatus
    currentRound?: IntFieldUpdateOperationsInput | number
    tacticsTotal?: IntFieldUpdateOperationsInput | number
    tacticsComplete?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scanTactics?: ScanTacticUpdateManyWithoutScanRunNestedInput
    scanFindings?: ScanFindingUpdateManyWithoutScanRunNestedInput
    scanAuditEntries?: ScanAuditEntryUpdateManyWithoutScanRunNestedInput
    escalationRoutes?: EscalationRouteUpdateManyWithoutScanRunNestedInput
  }

  export type ScanRunUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    scope?: JsonNullValueInput | InputJsonValue
    status?: EnumScanRunStatusFieldUpdateOperationsInput | $Enums.ScanRunStatus
    currentRound?: IntFieldUpdateOperationsInput | number
    tacticsTotal?: IntFieldUpdateOperationsInput | number
    tacticsComplete?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scanTactics?: ScanTacticUncheckedUpdateManyWithoutScanRunNestedInput
    scanFindings?: ScanFindingUncheckedUpdateManyWithoutScanRunNestedInput
    scanAuditEntries?: ScanAuditEntryUncheckedUpdateManyWithoutScanRunNestedInput
    escalationRoutes?: EscalationRouteUncheckedUpdateManyWithoutScanRunNestedInput
  }

  export type ScanRunCreateManyInput = {
    id: string
    scope: JsonNullValueInput | InputJsonValue
    status: $Enums.ScanRunStatus
    currentRound?: number
    tacticsTotal?: number
    tacticsComplete?: number
    createdAt?: Date | string
    completedAt?: Date | string | null
  }

  export type ScanRunUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    scope?: JsonNullValueInput | InputJsonValue
    status?: EnumScanRunStatusFieldUpdateOperationsInput | $Enums.ScanRunStatus
    currentRound?: IntFieldUpdateOperationsInput | number
    tacticsTotal?: IntFieldUpdateOperationsInput | number
    tacticsComplete?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ScanRunUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    scope?: JsonNullValueInput | InputJsonValue
    status?: EnumScanRunStatusFieldUpdateOperationsInput | $Enums.ScanRunStatus
    currentRound?: IntFieldUpdateOperationsInput | number
    tacticsTotal?: IntFieldUpdateOperationsInput | number
    tacticsComplete?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ScanTacticCreateInput = {
    id: string
    target: string
    layer: string
    service?: string | null
    port?: number | null
    riskScore: number
    status: $Enums.ScanTacticStatus
    depth: number
    createdAt?: Date | string
    scanRun: ScanRunCreateNestedOneWithoutScanTacticsInput
    parentTactic?: ScanTacticCreateNestedOneWithoutChildTacticsInput
    childTactics?: ScanTacticCreateNestedManyWithoutParentTacticInput
    scanFindings?: ScanFindingCreateNestedManyWithoutScanTacticInput
  }

  export type ScanTacticUncheckedCreateInput = {
    id: string
    scanRunId: string
    target: string
    layer: string
    service?: string | null
    port?: number | null
    riskScore: number
    status: $Enums.ScanTacticStatus
    parentTacticId?: string | null
    depth: number
    createdAt?: Date | string
    childTactics?: ScanTacticUncheckedCreateNestedManyWithoutParentTacticInput
    scanFindings?: ScanFindingUncheckedCreateNestedManyWithoutScanTacticInput
  }

  export type ScanTacticUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    layer?: StringFieldUpdateOperationsInput | string
    service?: NullableStringFieldUpdateOperationsInput | string | null
    port?: NullableIntFieldUpdateOperationsInput | number | null
    riskScore?: FloatFieldUpdateOperationsInput | number
    status?: EnumScanTacticStatusFieldUpdateOperationsInput | $Enums.ScanTacticStatus
    depth?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    scanRun?: ScanRunUpdateOneRequiredWithoutScanTacticsNestedInput
    parentTactic?: ScanTacticUpdateOneWithoutChildTacticsNestedInput
    childTactics?: ScanTacticUpdateManyWithoutParentTacticNestedInput
    scanFindings?: ScanFindingUpdateManyWithoutScanTacticNestedInput
  }

  export type ScanTacticUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    scanRunId?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    layer?: StringFieldUpdateOperationsInput | string
    service?: NullableStringFieldUpdateOperationsInput | string | null
    port?: NullableIntFieldUpdateOperationsInput | number | null
    riskScore?: FloatFieldUpdateOperationsInput | number
    status?: EnumScanTacticStatusFieldUpdateOperationsInput | $Enums.ScanTacticStatus
    parentTacticId?: NullableStringFieldUpdateOperationsInput | string | null
    depth?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    childTactics?: ScanTacticUncheckedUpdateManyWithoutParentTacticNestedInput
    scanFindings?: ScanFindingUncheckedUpdateManyWithoutScanTacticNestedInput
  }

  export type ScanTacticCreateManyInput = {
    id: string
    scanRunId: string
    target: string
    layer: string
    service?: string | null
    port?: number | null
    riskScore: number
    status: $Enums.ScanTacticStatus
    parentTacticId?: string | null
    depth: number
    createdAt?: Date | string
  }

  export type ScanTacticUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    layer?: StringFieldUpdateOperationsInput | string
    service?: NullableStringFieldUpdateOperationsInput | string | null
    port?: NullableIntFieldUpdateOperationsInput | number | null
    riskScore?: FloatFieldUpdateOperationsInput | number
    status?: EnumScanTacticStatusFieldUpdateOperationsInput | $Enums.ScanTacticStatus
    depth?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScanTacticUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    scanRunId?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    layer?: StringFieldUpdateOperationsInput | string
    service?: NullableStringFieldUpdateOperationsInput | string | null
    port?: NullableIntFieldUpdateOperationsInput | number | null
    riskScore?: FloatFieldUpdateOperationsInput | number
    status?: EnumScanTacticStatusFieldUpdateOperationsInput | $Enums.ScanTacticStatus
    parentTacticId?: NullableStringFieldUpdateOperationsInput | string | null
    depth?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScanFindingCreateInput = {
    id: string
    agentId: string
    severity: string
    confidence: number
    title: string
    description: string
    evidence: string
    technique: string
    reproduceCommand?: string | null
    validated?: boolean
    validationStatus?: string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: string | null
    createdAt?: Date | string
    scanRun: ScanRunCreateNestedOneWithoutScanFindingsInput
    scanTactic: ScanTacticCreateNestedOneWithoutScanFindingsInput
    routeFindings?: EscalationRouteFindingCreateNestedManyWithoutScanFindingInput
  }

  export type ScanFindingUncheckedCreateInput = {
    id: string
    scanRunId: string
    scanTacticId: string
    agentId: string
    severity: string
    confidence: number
    title: string
    description: string
    evidence: string
    technique: string
    reproduceCommand?: string | null
    validated?: boolean
    validationStatus?: string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: string | null
    createdAt?: Date | string
    routeFindings?: EscalationRouteFindingUncheckedCreateNestedManyWithoutScanFindingInput
  }

  export type ScanFindingUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    agentId?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    evidence?: StringFieldUpdateOperationsInput | string
    technique?: StringFieldUpdateOperationsInput | string
    reproduceCommand?: NullableStringFieldUpdateOperationsInput | string | null
    validated?: BoolFieldUpdateOperationsInput | boolean
    validationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    scanRun?: ScanRunUpdateOneRequiredWithoutScanFindingsNestedInput
    scanTactic?: ScanTacticUpdateOneRequiredWithoutScanFindingsNestedInput
    routeFindings?: EscalationRouteFindingUpdateManyWithoutScanFindingNestedInput
  }

  export type ScanFindingUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    scanRunId?: StringFieldUpdateOperationsInput | string
    scanTacticId?: StringFieldUpdateOperationsInput | string
    agentId?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    evidence?: StringFieldUpdateOperationsInput | string
    technique?: StringFieldUpdateOperationsInput | string
    reproduceCommand?: NullableStringFieldUpdateOperationsInput | string | null
    validated?: BoolFieldUpdateOperationsInput | boolean
    validationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    routeFindings?: EscalationRouteFindingUncheckedUpdateManyWithoutScanFindingNestedInput
  }

  export type ScanFindingCreateManyInput = {
    id: string
    scanRunId: string
    scanTacticId: string
    agentId: string
    severity: string
    confidence: number
    title: string
    description: string
    evidence: string
    technique: string
    reproduceCommand?: string | null
    validated?: boolean
    validationStatus?: string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: string | null
    createdAt?: Date | string
  }

  export type ScanFindingUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    agentId?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    evidence?: StringFieldUpdateOperationsInput | string
    technique?: StringFieldUpdateOperationsInput | string
    reproduceCommand?: NullableStringFieldUpdateOperationsInput | string | null
    validated?: BoolFieldUpdateOperationsInput | boolean
    validationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScanFindingUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    scanRunId?: StringFieldUpdateOperationsInput | string
    scanTacticId?: StringFieldUpdateOperationsInput | string
    agentId?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    evidence?: StringFieldUpdateOperationsInput | string
    technique?: StringFieldUpdateOperationsInput | string
    reproduceCommand?: NullableStringFieldUpdateOperationsInput | string | null
    validated?: BoolFieldUpdateOperationsInput | boolean
    validationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScanAuditEntryCreateInput = {
    id: string
    timestamp: Date | string
    actor: string
    action: string
    targetTacticId?: string | null
    scopeValid: boolean
    details: JsonNullValueInput | InputJsonValue
    scanRun: ScanRunCreateNestedOneWithoutScanAuditEntriesInput
  }

  export type ScanAuditEntryUncheckedCreateInput = {
    id: string
    scanRunId: string
    timestamp: Date | string
    actor: string
    action: string
    targetTacticId?: string | null
    scopeValid: boolean
    details: JsonNullValueInput | InputJsonValue
  }

  export type ScanAuditEntryUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    actor?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    targetTacticId?: NullableStringFieldUpdateOperationsInput | string | null
    scopeValid?: BoolFieldUpdateOperationsInput | boolean
    details?: JsonNullValueInput | InputJsonValue
    scanRun?: ScanRunUpdateOneRequiredWithoutScanAuditEntriesNestedInput
  }

  export type ScanAuditEntryUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    scanRunId?: StringFieldUpdateOperationsInput | string
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    actor?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    targetTacticId?: NullableStringFieldUpdateOperationsInput | string | null
    scopeValid?: BoolFieldUpdateOperationsInput | boolean
    details?: JsonNullValueInput | InputJsonValue
  }

  export type ScanAuditEntryCreateManyInput = {
    id: string
    scanRunId: string
    timestamp: Date | string
    actor: string
    action: string
    targetTacticId?: string | null
    scopeValid: boolean
    details: JsonNullValueInput | InputJsonValue
  }

  export type ScanAuditEntryUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    actor?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    targetTacticId?: NullableStringFieldUpdateOperationsInput | string | null
    scopeValid?: BoolFieldUpdateOperationsInput | boolean
    details?: JsonNullValueInput | InputJsonValue
  }

  export type ScanAuditEntryUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    scanRunId?: StringFieldUpdateOperationsInput | string
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    actor?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    targetTacticId?: NullableStringFieldUpdateOperationsInput | string | null
    scopeValid?: BoolFieldUpdateOperationsInput | boolean
    details?: JsonNullValueInput | InputJsonValue
  }

  export type EscalationRouteCreateInput = {
    id: string
    title: string
    compositeRisk: number
    technique: string
    startTarget: string
    endTarget: string
    routeLength: number
    confidence: number
    narrative?: string | null
    createdAt?: Date | string
    scanRun: ScanRunCreateNestedOneWithoutEscalationRoutesInput
    routeFindings?: EscalationRouteFindingCreateNestedManyWithoutEscalationRouteInput
  }

  export type EscalationRouteUncheckedCreateInput = {
    id: string
    scanRunId: string
    title: string
    compositeRisk: number
    technique: string
    startTarget: string
    endTarget: string
    routeLength: number
    confidence: number
    narrative?: string | null
    createdAt?: Date | string
    routeFindings?: EscalationRouteFindingUncheckedCreateNestedManyWithoutEscalationRouteInput
  }

  export type EscalationRouteUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    compositeRisk?: FloatFieldUpdateOperationsInput | number
    technique?: StringFieldUpdateOperationsInput | string
    startTarget?: StringFieldUpdateOperationsInput | string
    endTarget?: StringFieldUpdateOperationsInput | string
    routeLength?: IntFieldUpdateOperationsInput | number
    confidence?: FloatFieldUpdateOperationsInput | number
    narrative?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    scanRun?: ScanRunUpdateOneRequiredWithoutEscalationRoutesNestedInput
    routeFindings?: EscalationRouteFindingUpdateManyWithoutEscalationRouteNestedInput
  }

  export type EscalationRouteUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    scanRunId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    compositeRisk?: FloatFieldUpdateOperationsInput | number
    technique?: StringFieldUpdateOperationsInput | string
    startTarget?: StringFieldUpdateOperationsInput | string
    endTarget?: StringFieldUpdateOperationsInput | string
    routeLength?: IntFieldUpdateOperationsInput | number
    confidence?: FloatFieldUpdateOperationsInput | number
    narrative?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    routeFindings?: EscalationRouteFindingUncheckedUpdateManyWithoutEscalationRouteNestedInput
  }

  export type EscalationRouteCreateManyInput = {
    id: string
    scanRunId: string
    title: string
    compositeRisk: number
    technique: string
    startTarget: string
    endTarget: string
    routeLength: number
    confidence: number
    narrative?: string | null
    createdAt?: Date | string
  }

  export type EscalationRouteUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    compositeRisk?: FloatFieldUpdateOperationsInput | number
    technique?: StringFieldUpdateOperationsInput | string
    startTarget?: StringFieldUpdateOperationsInput | string
    endTarget?: StringFieldUpdateOperationsInput | string
    routeLength?: IntFieldUpdateOperationsInput | number
    confidence?: FloatFieldUpdateOperationsInput | number
    narrative?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EscalationRouteUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    scanRunId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    compositeRisk?: FloatFieldUpdateOperationsInput | number
    technique?: StringFieldUpdateOperationsInput | string
    startTarget?: StringFieldUpdateOperationsInput | string
    endTarget?: StringFieldUpdateOperationsInput | string
    routeLength?: IntFieldUpdateOperationsInput | number
    confidence?: FloatFieldUpdateOperationsInput | number
    narrative?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EscalationRouteFindingCreateInput = {
    ord: number
    linkProbability?: number | null
    escalationRoute: EscalationRouteCreateNestedOneWithoutRouteFindingsInput
    scanFinding: ScanFindingCreateNestedOneWithoutRouteFindingsInput
  }

  export type EscalationRouteFindingUncheckedCreateInput = {
    escalationRouteId: string
    scanFindingId: string
    ord: number
    linkProbability?: number | null
  }

  export type EscalationRouteFindingUpdateInput = {
    ord?: IntFieldUpdateOperationsInput | number
    linkProbability?: NullableFloatFieldUpdateOperationsInput | number | null
    escalationRoute?: EscalationRouteUpdateOneRequiredWithoutRouteFindingsNestedInput
    scanFinding?: ScanFindingUpdateOneRequiredWithoutRouteFindingsNestedInput
  }

  export type EscalationRouteFindingUncheckedUpdateInput = {
    escalationRouteId?: StringFieldUpdateOperationsInput | string
    scanFindingId?: StringFieldUpdateOperationsInput | string
    ord?: IntFieldUpdateOperationsInput | number
    linkProbability?: NullableFloatFieldUpdateOperationsInput | number | null
  }

  export type EscalationRouteFindingCreateManyInput = {
    escalationRouteId: string
    scanFindingId: string
    ord: number
    linkProbability?: number | null
  }

  export type EscalationRouteFindingUpdateManyMutationInput = {
    ord?: IntFieldUpdateOperationsInput | number
    linkProbability?: NullableFloatFieldUpdateOperationsInput | number | null
  }

  export type EscalationRouteFindingUncheckedUpdateManyInput = {
    escalationRouteId?: StringFieldUpdateOperationsInput | string
    scanFindingId?: StringFieldUpdateOperationsInput | string
    ord?: IntFieldUpdateOperationsInput | number
    linkProbability?: NullableFloatFieldUpdateOperationsInput | number | null
  }

  export type UuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type EnumApplicationEnvironmentFilter<$PrismaModel = never> = {
    equals?: $Enums.ApplicationEnvironment | EnumApplicationEnvironmentFieldRefInput<$PrismaModel>
    in?: $Enums.ApplicationEnvironment[] | ListEnumApplicationEnvironmentFieldRefInput<$PrismaModel>
    notIn?: $Enums.ApplicationEnvironment[] | ListEnumApplicationEnvironmentFieldRefInput<$PrismaModel>
    not?: NestedEnumApplicationEnvironmentFilter<$PrismaModel> | $Enums.ApplicationEnvironment
  }

  export type EnumApplicationStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ApplicationStatus | EnumApplicationStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ApplicationStatus[] | ListEnumApplicationStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ApplicationStatus[] | ListEnumApplicationStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumApplicationStatusFilter<$PrismaModel> | $Enums.ApplicationStatus
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type RuntimeListRelationFilter = {
    every?: RuntimeWhereInput
    some?: RuntimeWhereInput
    none?: RuntimeWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type RuntimeOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ApplicationCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    baseUrl?: SortOrder
    environment?: SortOrder
    status?: SortOrder
    lastScannedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ApplicationMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    baseUrl?: SortOrder
    environment?: SortOrder
    status?: SortOrder
    lastScannedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ApplicationMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    baseUrl?: SortOrder
    environment?: SortOrder
    status?: SortOrder
    lastScannedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumApplicationEnvironmentWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ApplicationEnvironment | EnumApplicationEnvironmentFieldRefInput<$PrismaModel>
    in?: $Enums.ApplicationEnvironment[] | ListEnumApplicationEnvironmentFieldRefInput<$PrismaModel>
    notIn?: $Enums.ApplicationEnvironment[] | ListEnumApplicationEnvironmentFieldRefInput<$PrismaModel>
    not?: NestedEnumApplicationEnvironmentWithAggregatesFilter<$PrismaModel> | $Enums.ApplicationEnvironment
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumApplicationEnvironmentFilter<$PrismaModel>
    _max?: NestedEnumApplicationEnvironmentFilter<$PrismaModel>
  }

  export type EnumApplicationStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ApplicationStatus | EnumApplicationStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ApplicationStatus[] | ListEnumApplicationStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ApplicationStatus[] | ListEnumApplicationStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumApplicationStatusWithAggregatesFilter<$PrismaModel> | $Enums.ApplicationStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumApplicationStatusFilter<$PrismaModel>
    _max?: NestedEnumApplicationStatusFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type EnumRuntimeServiceTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.RuntimeServiceType | EnumRuntimeServiceTypeFieldRefInput<$PrismaModel>
    in?: $Enums.RuntimeServiceType[] | ListEnumRuntimeServiceTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.RuntimeServiceType[] | ListEnumRuntimeServiceTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumRuntimeServiceTypeFilter<$PrismaModel> | $Enums.RuntimeServiceType
  }

  export type EnumRuntimeProviderFilter<$PrismaModel = never> = {
    equals?: $Enums.RuntimeProvider | EnumRuntimeProviderFieldRefInput<$PrismaModel>
    in?: $Enums.RuntimeProvider[] | ListEnumRuntimeProviderFieldRefInput<$PrismaModel>
    notIn?: $Enums.RuntimeProvider[] | ListEnumRuntimeProviderFieldRefInput<$PrismaModel>
    not?: NestedEnumRuntimeProviderFilter<$PrismaModel> | $Enums.RuntimeProvider
  }

  export type EnumRuntimeStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.RuntimeStatus | EnumRuntimeStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RuntimeStatus[] | ListEnumRuntimeStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RuntimeStatus[] | ListEnumRuntimeStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRuntimeStatusFilter<$PrismaModel> | $Enums.RuntimeStatus
  }

  export type UuidNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidNullableFilter<$PrismaModel> | string | null
  }

  export type ApplicationNullableScalarRelationFilter = {
    is?: ApplicationWhereInput | null
    isNot?: ApplicationWhereInput | null
  }

  export type RuntimeCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    serviceType?: SortOrder
    provider?: SortOrder
    environment?: SortOrder
    region?: SortOrder
    status?: SortOrder
    applicationId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RuntimeMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    serviceType?: SortOrder
    provider?: SortOrder
    environment?: SortOrder
    region?: SortOrder
    status?: SortOrder
    applicationId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RuntimeMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    serviceType?: SortOrder
    provider?: SortOrder
    environment?: SortOrder
    region?: SortOrder
    status?: SortOrder
    applicationId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumRuntimeServiceTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RuntimeServiceType | EnumRuntimeServiceTypeFieldRefInput<$PrismaModel>
    in?: $Enums.RuntimeServiceType[] | ListEnumRuntimeServiceTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.RuntimeServiceType[] | ListEnumRuntimeServiceTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumRuntimeServiceTypeWithAggregatesFilter<$PrismaModel> | $Enums.RuntimeServiceType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRuntimeServiceTypeFilter<$PrismaModel>
    _max?: NestedEnumRuntimeServiceTypeFilter<$PrismaModel>
  }

  export type EnumRuntimeProviderWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RuntimeProvider | EnumRuntimeProviderFieldRefInput<$PrismaModel>
    in?: $Enums.RuntimeProvider[] | ListEnumRuntimeProviderFieldRefInput<$PrismaModel>
    notIn?: $Enums.RuntimeProvider[] | ListEnumRuntimeProviderFieldRefInput<$PrismaModel>
    not?: NestedEnumRuntimeProviderWithAggregatesFilter<$PrismaModel> | $Enums.RuntimeProvider
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRuntimeProviderFilter<$PrismaModel>
    _max?: NestedEnumRuntimeProviderFilter<$PrismaModel>
  }

  export type EnumRuntimeStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RuntimeStatus | EnumRuntimeStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RuntimeStatus[] | ListEnumRuntimeStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RuntimeStatus[] | ListEnumRuntimeStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRuntimeStatusWithAggregatesFilter<$PrismaModel> | $Enums.RuntimeStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRuntimeStatusFilter<$PrismaModel>
    _max?: NestedEnumRuntimeStatusFilter<$PrismaModel>
  }

  export type UuidNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumAiProviderKindFilter<$PrismaModel = never> = {
    equals?: $Enums.AiProviderKind | EnumAiProviderKindFieldRefInput<$PrismaModel>
    in?: $Enums.AiProviderKind[] | ListEnumAiProviderKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiProviderKind[] | ListEnumAiProviderKindFieldRefInput<$PrismaModel>
    not?: NestedEnumAiProviderKindFilter<$PrismaModel> | $Enums.AiProviderKind
  }

  export type EnumAiProviderStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.AiProviderStatus | EnumAiProviderStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AiProviderStatus[] | ListEnumAiProviderStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiProviderStatus[] | ListEnumAiProviderStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAiProviderStatusFilter<$PrismaModel> | $Enums.AiProviderStatus
  }

  export type AiAgentListRelationFilter = {
    every?: AiAgentWhereInput
    some?: AiAgentWhereInput
    none?: AiAgentWhereInput
  }

  export type AiAgentOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AiProviderCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    kind?: SortOrder
    status?: SortOrder
    description?: SortOrder
    baseUrl?: SortOrder
    model?: SortOrder
    apiKey?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AiProviderMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    kind?: SortOrder
    status?: SortOrder
    description?: SortOrder
    baseUrl?: SortOrder
    model?: SortOrder
    apiKey?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AiProviderMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    kind?: SortOrder
    status?: SortOrder
    description?: SortOrder
    baseUrl?: SortOrder
    model?: SortOrder
    apiKey?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumAiProviderKindWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AiProviderKind | EnumAiProviderKindFieldRefInput<$PrismaModel>
    in?: $Enums.AiProviderKind[] | ListEnumAiProviderKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiProviderKind[] | ListEnumAiProviderKindFieldRefInput<$PrismaModel>
    not?: NestedEnumAiProviderKindWithAggregatesFilter<$PrismaModel> | $Enums.AiProviderKind
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAiProviderKindFilter<$PrismaModel>
    _max?: NestedEnumAiProviderKindFilter<$PrismaModel>
  }

  export type EnumAiProviderStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AiProviderStatus | EnumAiProviderStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AiProviderStatus[] | ListEnumAiProviderStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiProviderStatus[] | ListEnumAiProviderStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAiProviderStatusWithAggregatesFilter<$PrismaModel> | $Enums.AiProviderStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAiProviderStatusFilter<$PrismaModel>
    _max?: NestedEnumAiProviderStatusFilter<$PrismaModel>
  }

  export type EnumAiAgentStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.AiAgentStatus | EnumAiAgentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AiAgentStatus[] | ListEnumAiAgentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiAgentStatus[] | ListEnumAiAgentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAiAgentStatusFilter<$PrismaModel> | $Enums.AiAgentStatus
  }

  export type AiProviderScalarRelationFilter = {
    is?: AiProviderWhereInput
    isNot?: AiProviderWhereInput
  }

  export type AiAgentToolListRelationFilter = {
    every?: AiAgentToolWhereInput
    some?: AiAgentToolWhereInput
    none?: AiAgentToolWhereInput
  }

  export type AiAgentToolOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AiAgentCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    status?: SortOrder
    description?: SortOrder
    providerId?: SortOrder
    systemPrompt?: SortOrder
    modelOverride?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AiAgentMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    status?: SortOrder
    description?: SortOrder
    providerId?: SortOrder
    systemPrompt?: SortOrder
    modelOverride?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AiAgentMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    status?: SortOrder
    description?: SortOrder
    providerId?: SortOrder
    systemPrompt?: SortOrder
    modelOverride?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumAiAgentStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AiAgentStatus | EnumAiAgentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AiAgentStatus[] | ListEnumAiAgentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiAgentStatus[] | ListEnumAiAgentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAiAgentStatusWithAggregatesFilter<$PrismaModel> | $Enums.AiAgentStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAiAgentStatusFilter<$PrismaModel>
    _max?: NestedEnumAiAgentStatusFilter<$PrismaModel>
  }

  export type EnumAiToolStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.AiToolStatus | EnumAiToolStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AiToolStatus[] | ListEnumAiToolStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiToolStatus[] | ListEnumAiToolStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAiToolStatusFilter<$PrismaModel> | $Enums.AiToolStatus
  }

  export type EnumAiToolSourceFilter<$PrismaModel = never> = {
    equals?: $Enums.AiToolSource | EnumAiToolSourceFieldRefInput<$PrismaModel>
    in?: $Enums.AiToolSource[] | ListEnumAiToolSourceFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiToolSource[] | ListEnumAiToolSourceFieldRefInput<$PrismaModel>
    not?: NestedEnumAiToolSourceFilter<$PrismaModel> | $Enums.AiToolSource
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type AiToolCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    status?: SortOrder
    source?: SortOrder
    description?: SortOrder
    adapter?: SortOrder
    binary?: SortOrder
    category?: SortOrder
    riskTier?: SortOrder
    notes?: SortOrder
    inputSchema?: SortOrder
    outputSchema?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AiToolMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    status?: SortOrder
    source?: SortOrder
    description?: SortOrder
    adapter?: SortOrder
    binary?: SortOrder
    category?: SortOrder
    riskTier?: SortOrder
    notes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AiToolMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    status?: SortOrder
    source?: SortOrder
    description?: SortOrder
    adapter?: SortOrder
    binary?: SortOrder
    category?: SortOrder
    riskTier?: SortOrder
    notes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumAiToolStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AiToolStatus | EnumAiToolStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AiToolStatus[] | ListEnumAiToolStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiToolStatus[] | ListEnumAiToolStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAiToolStatusWithAggregatesFilter<$PrismaModel> | $Enums.AiToolStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAiToolStatusFilter<$PrismaModel>
    _max?: NestedEnumAiToolStatusFilter<$PrismaModel>
  }

  export type EnumAiToolSourceWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AiToolSource | EnumAiToolSourceFieldRefInput<$PrismaModel>
    in?: $Enums.AiToolSource[] | ListEnumAiToolSourceFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiToolSource[] | ListEnumAiToolSourceFieldRefInput<$PrismaModel>
    not?: NestedEnumAiToolSourceWithAggregatesFilter<$PrismaModel> | $Enums.AiToolSource
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAiToolSourceFilter<$PrismaModel>
    _max?: NestedEnumAiToolSourceFilter<$PrismaModel>
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type AiAgentScalarRelationFilter = {
    is?: AiAgentWhereInput
    isNot?: AiAgentWhereInput
  }

  export type AiToolScalarRelationFilter = {
    is?: AiToolWhereInput
    isNot?: AiToolWhereInput
  }

  export type AiAgentToolAgentIdToolIdCompoundUniqueInput = {
    agentId: string
    toolId: string
  }

  export type AiAgentToolCountOrderByAggregateInput = {
    agentId?: SortOrder
    toolId?: SortOrder
    ord?: SortOrder
  }

  export type AiAgentToolAvgOrderByAggregateInput = {
    ord?: SortOrder
  }

  export type AiAgentToolMaxOrderByAggregateInput = {
    agentId?: SortOrder
    toolId?: SortOrder
    ord?: SortOrder
  }

  export type AiAgentToolMinOrderByAggregateInput = {
    agentId?: SortOrder
    toolId?: SortOrder
    ord?: SortOrder
  }

  export type AiAgentToolSumOrderByAggregateInput = {
    ord?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type EnumScanRunStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ScanRunStatus | EnumScanRunStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ScanRunStatus[] | ListEnumScanRunStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ScanRunStatus[] | ListEnumScanRunStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumScanRunStatusFilter<$PrismaModel> | $Enums.ScanRunStatus
  }

  export type ScanTacticListRelationFilter = {
    every?: ScanTacticWhereInput
    some?: ScanTacticWhereInput
    none?: ScanTacticWhereInput
  }

  export type ScanFindingListRelationFilter = {
    every?: ScanFindingWhereInput
    some?: ScanFindingWhereInput
    none?: ScanFindingWhereInput
  }

  export type ScanAuditEntryListRelationFilter = {
    every?: ScanAuditEntryWhereInput
    some?: ScanAuditEntryWhereInput
    none?: ScanAuditEntryWhereInput
  }

  export type EscalationRouteListRelationFilter = {
    every?: EscalationRouteWhereInput
    some?: EscalationRouteWhereInput
    none?: EscalationRouteWhereInput
  }

  export type ScanTacticOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ScanFindingOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ScanAuditEntryOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type EscalationRouteOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ScanRunCountOrderByAggregateInput = {
    id?: SortOrder
    scope?: SortOrder
    status?: SortOrder
    currentRound?: SortOrder
    tacticsTotal?: SortOrder
    tacticsComplete?: SortOrder
    createdAt?: SortOrder
    completedAt?: SortOrder
  }

  export type ScanRunAvgOrderByAggregateInput = {
    currentRound?: SortOrder
    tacticsTotal?: SortOrder
    tacticsComplete?: SortOrder
  }

  export type ScanRunMaxOrderByAggregateInput = {
    id?: SortOrder
    status?: SortOrder
    currentRound?: SortOrder
    tacticsTotal?: SortOrder
    tacticsComplete?: SortOrder
    createdAt?: SortOrder
    completedAt?: SortOrder
  }

  export type ScanRunMinOrderByAggregateInput = {
    id?: SortOrder
    status?: SortOrder
    currentRound?: SortOrder
    tacticsTotal?: SortOrder
    tacticsComplete?: SortOrder
    createdAt?: SortOrder
    completedAt?: SortOrder
  }

  export type ScanRunSumOrderByAggregateInput = {
    currentRound?: SortOrder
    tacticsTotal?: SortOrder
    tacticsComplete?: SortOrder
  }

  export type EnumScanRunStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ScanRunStatus | EnumScanRunStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ScanRunStatus[] | ListEnumScanRunStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ScanRunStatus[] | ListEnumScanRunStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumScanRunStatusWithAggregatesFilter<$PrismaModel> | $Enums.ScanRunStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumScanRunStatusFilter<$PrismaModel>
    _max?: NestedEnumScanRunStatusFilter<$PrismaModel>
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type EnumScanTacticStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ScanTacticStatus | EnumScanTacticStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ScanTacticStatus[] | ListEnumScanTacticStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ScanTacticStatus[] | ListEnumScanTacticStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumScanTacticStatusFilter<$PrismaModel> | $Enums.ScanTacticStatus
  }

  export type ScanRunScalarRelationFilter = {
    is?: ScanRunWhereInput
    isNot?: ScanRunWhereInput
  }

  export type ScanTacticNullableScalarRelationFilter = {
    is?: ScanTacticWhereInput | null
    isNot?: ScanTacticWhereInput | null
  }

  export type ScanTacticCountOrderByAggregateInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    target?: SortOrder
    layer?: SortOrder
    service?: SortOrder
    port?: SortOrder
    riskScore?: SortOrder
    status?: SortOrder
    parentTacticId?: SortOrder
    depth?: SortOrder
    createdAt?: SortOrder
  }

  export type ScanTacticAvgOrderByAggregateInput = {
    port?: SortOrder
    riskScore?: SortOrder
    depth?: SortOrder
  }

  export type ScanTacticMaxOrderByAggregateInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    target?: SortOrder
    layer?: SortOrder
    service?: SortOrder
    port?: SortOrder
    riskScore?: SortOrder
    status?: SortOrder
    parentTacticId?: SortOrder
    depth?: SortOrder
    createdAt?: SortOrder
  }

  export type ScanTacticMinOrderByAggregateInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    target?: SortOrder
    layer?: SortOrder
    service?: SortOrder
    port?: SortOrder
    riskScore?: SortOrder
    status?: SortOrder
    parentTacticId?: SortOrder
    depth?: SortOrder
    createdAt?: SortOrder
  }

  export type ScanTacticSumOrderByAggregateInput = {
    port?: SortOrder
    riskScore?: SortOrder
    depth?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type EnumScanTacticStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ScanTacticStatus | EnumScanTacticStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ScanTacticStatus[] | ListEnumScanTacticStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ScanTacticStatus[] | ListEnumScanTacticStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumScanTacticStatusWithAggregatesFilter<$PrismaModel> | $Enums.ScanTacticStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumScanTacticStatusFilter<$PrismaModel>
    _max?: NestedEnumScanTacticStatusFilter<$PrismaModel>
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type ScanTacticScalarRelationFilter = {
    is?: ScanTacticWhereInput
    isNot?: ScanTacticWhereInput
  }

  export type EscalationRouteFindingListRelationFilter = {
    every?: EscalationRouteFindingWhereInput
    some?: EscalationRouteFindingWhereInput
    none?: EscalationRouteFindingWhereInput
  }

  export type EscalationRouteFindingOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ScanFindingCountOrderByAggregateInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    scanTacticId?: SortOrder
    agentId?: SortOrder
    severity?: SortOrder
    confidence?: SortOrder
    title?: SortOrder
    description?: SortOrder
    evidence?: SortOrder
    technique?: SortOrder
    reproduceCommand?: SortOrder
    validated?: SortOrder
    validationStatus?: SortOrder
    evidenceRefs?: SortOrder
    sourceToolRuns?: SortOrder
    confidenceReason?: SortOrder
    createdAt?: SortOrder
  }

  export type ScanFindingAvgOrderByAggregateInput = {
    confidence?: SortOrder
  }

  export type ScanFindingMaxOrderByAggregateInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    scanTacticId?: SortOrder
    agentId?: SortOrder
    severity?: SortOrder
    confidence?: SortOrder
    title?: SortOrder
    description?: SortOrder
    evidence?: SortOrder
    technique?: SortOrder
    reproduceCommand?: SortOrder
    validated?: SortOrder
    validationStatus?: SortOrder
    confidenceReason?: SortOrder
    createdAt?: SortOrder
  }

  export type ScanFindingMinOrderByAggregateInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    scanTacticId?: SortOrder
    agentId?: SortOrder
    severity?: SortOrder
    confidence?: SortOrder
    title?: SortOrder
    description?: SortOrder
    evidence?: SortOrder
    technique?: SortOrder
    reproduceCommand?: SortOrder
    validated?: SortOrder
    validationStatus?: SortOrder
    confidenceReason?: SortOrder
    createdAt?: SortOrder
  }

  export type ScanFindingSumOrderByAggregateInput = {
    confidence?: SortOrder
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type ScanAuditEntryCountOrderByAggregateInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    timestamp?: SortOrder
    actor?: SortOrder
    action?: SortOrder
    targetTacticId?: SortOrder
    scopeValid?: SortOrder
    details?: SortOrder
  }

  export type ScanAuditEntryMaxOrderByAggregateInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    timestamp?: SortOrder
    actor?: SortOrder
    action?: SortOrder
    targetTacticId?: SortOrder
    scopeValid?: SortOrder
  }

  export type ScanAuditEntryMinOrderByAggregateInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    timestamp?: SortOrder
    actor?: SortOrder
    action?: SortOrder
    targetTacticId?: SortOrder
    scopeValid?: SortOrder
  }

  export type EscalationRouteCountOrderByAggregateInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    title?: SortOrder
    compositeRisk?: SortOrder
    technique?: SortOrder
    startTarget?: SortOrder
    endTarget?: SortOrder
    routeLength?: SortOrder
    confidence?: SortOrder
    narrative?: SortOrder
    createdAt?: SortOrder
  }

  export type EscalationRouteAvgOrderByAggregateInput = {
    compositeRisk?: SortOrder
    routeLength?: SortOrder
    confidence?: SortOrder
  }

  export type EscalationRouteMaxOrderByAggregateInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    title?: SortOrder
    compositeRisk?: SortOrder
    technique?: SortOrder
    startTarget?: SortOrder
    endTarget?: SortOrder
    routeLength?: SortOrder
    confidence?: SortOrder
    narrative?: SortOrder
    createdAt?: SortOrder
  }

  export type EscalationRouteMinOrderByAggregateInput = {
    id?: SortOrder
    scanRunId?: SortOrder
    title?: SortOrder
    compositeRisk?: SortOrder
    technique?: SortOrder
    startTarget?: SortOrder
    endTarget?: SortOrder
    routeLength?: SortOrder
    confidence?: SortOrder
    narrative?: SortOrder
    createdAt?: SortOrder
  }

  export type EscalationRouteSumOrderByAggregateInput = {
    compositeRisk?: SortOrder
    routeLength?: SortOrder
    confidence?: SortOrder
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type EscalationRouteScalarRelationFilter = {
    is?: EscalationRouteWhereInput
    isNot?: EscalationRouteWhereInput
  }

  export type ScanFindingScalarRelationFilter = {
    is?: ScanFindingWhereInput
    isNot?: ScanFindingWhereInput
  }

  export type EscalationRouteFindingEscalationRouteIdScanFindingIdOrdCompoundUniqueInput = {
    escalationRouteId: string
    scanFindingId: string
    ord: number
  }

  export type EscalationRouteFindingCountOrderByAggregateInput = {
    escalationRouteId?: SortOrder
    scanFindingId?: SortOrder
    ord?: SortOrder
    linkProbability?: SortOrder
  }

  export type EscalationRouteFindingAvgOrderByAggregateInput = {
    ord?: SortOrder
    linkProbability?: SortOrder
  }

  export type EscalationRouteFindingMaxOrderByAggregateInput = {
    escalationRouteId?: SortOrder
    scanFindingId?: SortOrder
    ord?: SortOrder
    linkProbability?: SortOrder
  }

  export type EscalationRouteFindingMinOrderByAggregateInput = {
    escalationRouteId?: SortOrder
    scanFindingId?: SortOrder
    ord?: SortOrder
    linkProbability?: SortOrder
  }

  export type EscalationRouteFindingSumOrderByAggregateInput = {
    ord?: SortOrder
    linkProbability?: SortOrder
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type RuntimeCreateNestedManyWithoutApplicationInput = {
    create?: XOR<RuntimeCreateWithoutApplicationInput, RuntimeUncheckedCreateWithoutApplicationInput> | RuntimeCreateWithoutApplicationInput[] | RuntimeUncheckedCreateWithoutApplicationInput[]
    connectOrCreate?: RuntimeCreateOrConnectWithoutApplicationInput | RuntimeCreateOrConnectWithoutApplicationInput[]
    createMany?: RuntimeCreateManyApplicationInputEnvelope
    connect?: RuntimeWhereUniqueInput | RuntimeWhereUniqueInput[]
  }

  export type RuntimeUncheckedCreateNestedManyWithoutApplicationInput = {
    create?: XOR<RuntimeCreateWithoutApplicationInput, RuntimeUncheckedCreateWithoutApplicationInput> | RuntimeCreateWithoutApplicationInput[] | RuntimeUncheckedCreateWithoutApplicationInput[]
    connectOrCreate?: RuntimeCreateOrConnectWithoutApplicationInput | RuntimeCreateOrConnectWithoutApplicationInput[]
    createMany?: RuntimeCreateManyApplicationInputEnvelope
    connect?: RuntimeWhereUniqueInput | RuntimeWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type EnumApplicationEnvironmentFieldUpdateOperationsInput = {
    set?: $Enums.ApplicationEnvironment
  }

  export type EnumApplicationStatusFieldUpdateOperationsInput = {
    set?: $Enums.ApplicationStatus
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type RuntimeUpdateManyWithoutApplicationNestedInput = {
    create?: XOR<RuntimeCreateWithoutApplicationInput, RuntimeUncheckedCreateWithoutApplicationInput> | RuntimeCreateWithoutApplicationInput[] | RuntimeUncheckedCreateWithoutApplicationInput[]
    connectOrCreate?: RuntimeCreateOrConnectWithoutApplicationInput | RuntimeCreateOrConnectWithoutApplicationInput[]
    upsert?: RuntimeUpsertWithWhereUniqueWithoutApplicationInput | RuntimeUpsertWithWhereUniqueWithoutApplicationInput[]
    createMany?: RuntimeCreateManyApplicationInputEnvelope
    set?: RuntimeWhereUniqueInput | RuntimeWhereUniqueInput[]
    disconnect?: RuntimeWhereUniqueInput | RuntimeWhereUniqueInput[]
    delete?: RuntimeWhereUniqueInput | RuntimeWhereUniqueInput[]
    connect?: RuntimeWhereUniqueInput | RuntimeWhereUniqueInput[]
    update?: RuntimeUpdateWithWhereUniqueWithoutApplicationInput | RuntimeUpdateWithWhereUniqueWithoutApplicationInput[]
    updateMany?: RuntimeUpdateManyWithWhereWithoutApplicationInput | RuntimeUpdateManyWithWhereWithoutApplicationInput[]
    deleteMany?: RuntimeScalarWhereInput | RuntimeScalarWhereInput[]
  }

  export type RuntimeUncheckedUpdateManyWithoutApplicationNestedInput = {
    create?: XOR<RuntimeCreateWithoutApplicationInput, RuntimeUncheckedCreateWithoutApplicationInput> | RuntimeCreateWithoutApplicationInput[] | RuntimeUncheckedCreateWithoutApplicationInput[]
    connectOrCreate?: RuntimeCreateOrConnectWithoutApplicationInput | RuntimeCreateOrConnectWithoutApplicationInput[]
    upsert?: RuntimeUpsertWithWhereUniqueWithoutApplicationInput | RuntimeUpsertWithWhereUniqueWithoutApplicationInput[]
    createMany?: RuntimeCreateManyApplicationInputEnvelope
    set?: RuntimeWhereUniqueInput | RuntimeWhereUniqueInput[]
    disconnect?: RuntimeWhereUniqueInput | RuntimeWhereUniqueInput[]
    delete?: RuntimeWhereUniqueInput | RuntimeWhereUniqueInput[]
    connect?: RuntimeWhereUniqueInput | RuntimeWhereUniqueInput[]
    update?: RuntimeUpdateWithWhereUniqueWithoutApplicationInput | RuntimeUpdateWithWhereUniqueWithoutApplicationInput[]
    updateMany?: RuntimeUpdateManyWithWhereWithoutApplicationInput | RuntimeUpdateManyWithWhereWithoutApplicationInput[]
    deleteMany?: RuntimeScalarWhereInput | RuntimeScalarWhereInput[]
  }

  export type ApplicationCreateNestedOneWithoutRuntimesInput = {
    create?: XOR<ApplicationCreateWithoutRuntimesInput, ApplicationUncheckedCreateWithoutRuntimesInput>
    connectOrCreate?: ApplicationCreateOrConnectWithoutRuntimesInput
    connect?: ApplicationWhereUniqueInput
  }

  export type EnumRuntimeServiceTypeFieldUpdateOperationsInput = {
    set?: $Enums.RuntimeServiceType
  }

  export type EnumRuntimeProviderFieldUpdateOperationsInput = {
    set?: $Enums.RuntimeProvider
  }

  export type EnumRuntimeStatusFieldUpdateOperationsInput = {
    set?: $Enums.RuntimeStatus
  }

  export type ApplicationUpdateOneWithoutRuntimesNestedInput = {
    create?: XOR<ApplicationCreateWithoutRuntimesInput, ApplicationUncheckedCreateWithoutRuntimesInput>
    connectOrCreate?: ApplicationCreateOrConnectWithoutRuntimesInput
    upsert?: ApplicationUpsertWithoutRuntimesInput
    disconnect?: ApplicationWhereInput | boolean
    delete?: ApplicationWhereInput | boolean
    connect?: ApplicationWhereUniqueInput
    update?: XOR<XOR<ApplicationUpdateToOneWithWhereWithoutRuntimesInput, ApplicationUpdateWithoutRuntimesInput>, ApplicationUncheckedUpdateWithoutRuntimesInput>
  }

  export type AiAgentCreateNestedManyWithoutProviderInput = {
    create?: XOR<AiAgentCreateWithoutProviderInput, AiAgentUncheckedCreateWithoutProviderInput> | AiAgentCreateWithoutProviderInput[] | AiAgentUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: AiAgentCreateOrConnectWithoutProviderInput | AiAgentCreateOrConnectWithoutProviderInput[]
    createMany?: AiAgentCreateManyProviderInputEnvelope
    connect?: AiAgentWhereUniqueInput | AiAgentWhereUniqueInput[]
  }

  export type AiAgentUncheckedCreateNestedManyWithoutProviderInput = {
    create?: XOR<AiAgentCreateWithoutProviderInput, AiAgentUncheckedCreateWithoutProviderInput> | AiAgentCreateWithoutProviderInput[] | AiAgentUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: AiAgentCreateOrConnectWithoutProviderInput | AiAgentCreateOrConnectWithoutProviderInput[]
    createMany?: AiAgentCreateManyProviderInputEnvelope
    connect?: AiAgentWhereUniqueInput | AiAgentWhereUniqueInput[]
  }

  export type EnumAiProviderKindFieldUpdateOperationsInput = {
    set?: $Enums.AiProviderKind
  }

  export type EnumAiProviderStatusFieldUpdateOperationsInput = {
    set?: $Enums.AiProviderStatus
  }

  export type AiAgentUpdateManyWithoutProviderNestedInput = {
    create?: XOR<AiAgentCreateWithoutProviderInput, AiAgentUncheckedCreateWithoutProviderInput> | AiAgentCreateWithoutProviderInput[] | AiAgentUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: AiAgentCreateOrConnectWithoutProviderInput | AiAgentCreateOrConnectWithoutProviderInput[]
    upsert?: AiAgentUpsertWithWhereUniqueWithoutProviderInput | AiAgentUpsertWithWhereUniqueWithoutProviderInput[]
    createMany?: AiAgentCreateManyProviderInputEnvelope
    set?: AiAgentWhereUniqueInput | AiAgentWhereUniqueInput[]
    disconnect?: AiAgentWhereUniqueInput | AiAgentWhereUniqueInput[]
    delete?: AiAgentWhereUniqueInput | AiAgentWhereUniqueInput[]
    connect?: AiAgentWhereUniqueInput | AiAgentWhereUniqueInput[]
    update?: AiAgentUpdateWithWhereUniqueWithoutProviderInput | AiAgentUpdateWithWhereUniqueWithoutProviderInput[]
    updateMany?: AiAgentUpdateManyWithWhereWithoutProviderInput | AiAgentUpdateManyWithWhereWithoutProviderInput[]
    deleteMany?: AiAgentScalarWhereInput | AiAgentScalarWhereInput[]
  }

  export type AiAgentUncheckedUpdateManyWithoutProviderNestedInput = {
    create?: XOR<AiAgentCreateWithoutProviderInput, AiAgentUncheckedCreateWithoutProviderInput> | AiAgentCreateWithoutProviderInput[] | AiAgentUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: AiAgentCreateOrConnectWithoutProviderInput | AiAgentCreateOrConnectWithoutProviderInput[]
    upsert?: AiAgentUpsertWithWhereUniqueWithoutProviderInput | AiAgentUpsertWithWhereUniqueWithoutProviderInput[]
    createMany?: AiAgentCreateManyProviderInputEnvelope
    set?: AiAgentWhereUniqueInput | AiAgentWhereUniqueInput[]
    disconnect?: AiAgentWhereUniqueInput | AiAgentWhereUniqueInput[]
    delete?: AiAgentWhereUniqueInput | AiAgentWhereUniqueInput[]
    connect?: AiAgentWhereUniqueInput | AiAgentWhereUniqueInput[]
    update?: AiAgentUpdateWithWhereUniqueWithoutProviderInput | AiAgentUpdateWithWhereUniqueWithoutProviderInput[]
    updateMany?: AiAgentUpdateManyWithWhereWithoutProviderInput | AiAgentUpdateManyWithWhereWithoutProviderInput[]
    deleteMany?: AiAgentScalarWhereInput | AiAgentScalarWhereInput[]
  }

  export type AiProviderCreateNestedOneWithoutAgentsInput = {
    create?: XOR<AiProviderCreateWithoutAgentsInput, AiProviderUncheckedCreateWithoutAgentsInput>
    connectOrCreate?: AiProviderCreateOrConnectWithoutAgentsInput
    connect?: AiProviderWhereUniqueInput
  }

  export type AiAgentToolCreateNestedManyWithoutAgentInput = {
    create?: XOR<AiAgentToolCreateWithoutAgentInput, AiAgentToolUncheckedCreateWithoutAgentInput> | AiAgentToolCreateWithoutAgentInput[] | AiAgentToolUncheckedCreateWithoutAgentInput[]
    connectOrCreate?: AiAgentToolCreateOrConnectWithoutAgentInput | AiAgentToolCreateOrConnectWithoutAgentInput[]
    createMany?: AiAgentToolCreateManyAgentInputEnvelope
    connect?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
  }

  export type AiAgentToolUncheckedCreateNestedManyWithoutAgentInput = {
    create?: XOR<AiAgentToolCreateWithoutAgentInput, AiAgentToolUncheckedCreateWithoutAgentInput> | AiAgentToolCreateWithoutAgentInput[] | AiAgentToolUncheckedCreateWithoutAgentInput[]
    connectOrCreate?: AiAgentToolCreateOrConnectWithoutAgentInput | AiAgentToolCreateOrConnectWithoutAgentInput[]
    createMany?: AiAgentToolCreateManyAgentInputEnvelope
    connect?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
  }

  export type EnumAiAgentStatusFieldUpdateOperationsInput = {
    set?: $Enums.AiAgentStatus
  }

  export type AiProviderUpdateOneRequiredWithoutAgentsNestedInput = {
    create?: XOR<AiProviderCreateWithoutAgentsInput, AiProviderUncheckedCreateWithoutAgentsInput>
    connectOrCreate?: AiProviderCreateOrConnectWithoutAgentsInput
    upsert?: AiProviderUpsertWithoutAgentsInput
    connect?: AiProviderWhereUniqueInput
    update?: XOR<XOR<AiProviderUpdateToOneWithWhereWithoutAgentsInput, AiProviderUpdateWithoutAgentsInput>, AiProviderUncheckedUpdateWithoutAgentsInput>
  }

  export type AiAgentToolUpdateManyWithoutAgentNestedInput = {
    create?: XOR<AiAgentToolCreateWithoutAgentInput, AiAgentToolUncheckedCreateWithoutAgentInput> | AiAgentToolCreateWithoutAgentInput[] | AiAgentToolUncheckedCreateWithoutAgentInput[]
    connectOrCreate?: AiAgentToolCreateOrConnectWithoutAgentInput | AiAgentToolCreateOrConnectWithoutAgentInput[]
    upsert?: AiAgentToolUpsertWithWhereUniqueWithoutAgentInput | AiAgentToolUpsertWithWhereUniqueWithoutAgentInput[]
    createMany?: AiAgentToolCreateManyAgentInputEnvelope
    set?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
    disconnect?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
    delete?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
    connect?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
    update?: AiAgentToolUpdateWithWhereUniqueWithoutAgentInput | AiAgentToolUpdateWithWhereUniqueWithoutAgentInput[]
    updateMany?: AiAgentToolUpdateManyWithWhereWithoutAgentInput | AiAgentToolUpdateManyWithWhereWithoutAgentInput[]
    deleteMany?: AiAgentToolScalarWhereInput | AiAgentToolScalarWhereInput[]
  }

  export type AiAgentToolUncheckedUpdateManyWithoutAgentNestedInput = {
    create?: XOR<AiAgentToolCreateWithoutAgentInput, AiAgentToolUncheckedCreateWithoutAgentInput> | AiAgentToolCreateWithoutAgentInput[] | AiAgentToolUncheckedCreateWithoutAgentInput[]
    connectOrCreate?: AiAgentToolCreateOrConnectWithoutAgentInput | AiAgentToolCreateOrConnectWithoutAgentInput[]
    upsert?: AiAgentToolUpsertWithWhereUniqueWithoutAgentInput | AiAgentToolUpsertWithWhereUniqueWithoutAgentInput[]
    createMany?: AiAgentToolCreateManyAgentInputEnvelope
    set?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
    disconnect?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
    delete?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
    connect?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
    update?: AiAgentToolUpdateWithWhereUniqueWithoutAgentInput | AiAgentToolUpdateWithWhereUniqueWithoutAgentInput[]
    updateMany?: AiAgentToolUpdateManyWithWhereWithoutAgentInput | AiAgentToolUpdateManyWithWhereWithoutAgentInput[]
    deleteMany?: AiAgentToolScalarWhereInput | AiAgentToolScalarWhereInput[]
  }

  export type AiAgentToolCreateNestedManyWithoutToolInput = {
    create?: XOR<AiAgentToolCreateWithoutToolInput, AiAgentToolUncheckedCreateWithoutToolInput> | AiAgentToolCreateWithoutToolInput[] | AiAgentToolUncheckedCreateWithoutToolInput[]
    connectOrCreate?: AiAgentToolCreateOrConnectWithoutToolInput | AiAgentToolCreateOrConnectWithoutToolInput[]
    createMany?: AiAgentToolCreateManyToolInputEnvelope
    connect?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
  }

  export type AiAgentToolUncheckedCreateNestedManyWithoutToolInput = {
    create?: XOR<AiAgentToolCreateWithoutToolInput, AiAgentToolUncheckedCreateWithoutToolInput> | AiAgentToolCreateWithoutToolInput[] | AiAgentToolUncheckedCreateWithoutToolInput[]
    connectOrCreate?: AiAgentToolCreateOrConnectWithoutToolInput | AiAgentToolCreateOrConnectWithoutToolInput[]
    createMany?: AiAgentToolCreateManyToolInputEnvelope
    connect?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
  }

  export type EnumAiToolStatusFieldUpdateOperationsInput = {
    set?: $Enums.AiToolStatus
  }

  export type EnumAiToolSourceFieldUpdateOperationsInput = {
    set?: $Enums.AiToolSource
  }

  export type AiAgentToolUpdateManyWithoutToolNestedInput = {
    create?: XOR<AiAgentToolCreateWithoutToolInput, AiAgentToolUncheckedCreateWithoutToolInput> | AiAgentToolCreateWithoutToolInput[] | AiAgentToolUncheckedCreateWithoutToolInput[]
    connectOrCreate?: AiAgentToolCreateOrConnectWithoutToolInput | AiAgentToolCreateOrConnectWithoutToolInput[]
    upsert?: AiAgentToolUpsertWithWhereUniqueWithoutToolInput | AiAgentToolUpsertWithWhereUniqueWithoutToolInput[]
    createMany?: AiAgentToolCreateManyToolInputEnvelope
    set?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
    disconnect?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
    delete?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
    connect?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
    update?: AiAgentToolUpdateWithWhereUniqueWithoutToolInput | AiAgentToolUpdateWithWhereUniqueWithoutToolInput[]
    updateMany?: AiAgentToolUpdateManyWithWhereWithoutToolInput | AiAgentToolUpdateManyWithWhereWithoutToolInput[]
    deleteMany?: AiAgentToolScalarWhereInput | AiAgentToolScalarWhereInput[]
  }

  export type AiAgentToolUncheckedUpdateManyWithoutToolNestedInput = {
    create?: XOR<AiAgentToolCreateWithoutToolInput, AiAgentToolUncheckedCreateWithoutToolInput> | AiAgentToolCreateWithoutToolInput[] | AiAgentToolUncheckedCreateWithoutToolInput[]
    connectOrCreate?: AiAgentToolCreateOrConnectWithoutToolInput | AiAgentToolCreateOrConnectWithoutToolInput[]
    upsert?: AiAgentToolUpsertWithWhereUniqueWithoutToolInput | AiAgentToolUpsertWithWhereUniqueWithoutToolInput[]
    createMany?: AiAgentToolCreateManyToolInputEnvelope
    set?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
    disconnect?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
    delete?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
    connect?: AiAgentToolWhereUniqueInput | AiAgentToolWhereUniqueInput[]
    update?: AiAgentToolUpdateWithWhereUniqueWithoutToolInput | AiAgentToolUpdateWithWhereUniqueWithoutToolInput[]
    updateMany?: AiAgentToolUpdateManyWithWhereWithoutToolInput | AiAgentToolUpdateManyWithWhereWithoutToolInput[]
    deleteMany?: AiAgentToolScalarWhereInput | AiAgentToolScalarWhereInput[]
  }

  export type AiAgentCreateNestedOneWithoutToolsInput = {
    create?: XOR<AiAgentCreateWithoutToolsInput, AiAgentUncheckedCreateWithoutToolsInput>
    connectOrCreate?: AiAgentCreateOrConnectWithoutToolsInput
    connect?: AiAgentWhereUniqueInput
  }

  export type AiToolCreateNestedOneWithoutAgentsInput = {
    create?: XOR<AiToolCreateWithoutAgentsInput, AiToolUncheckedCreateWithoutAgentsInput>
    connectOrCreate?: AiToolCreateOrConnectWithoutAgentsInput
    connect?: AiToolWhereUniqueInput
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type AiAgentUpdateOneRequiredWithoutToolsNestedInput = {
    create?: XOR<AiAgentCreateWithoutToolsInput, AiAgentUncheckedCreateWithoutToolsInput>
    connectOrCreate?: AiAgentCreateOrConnectWithoutToolsInput
    upsert?: AiAgentUpsertWithoutToolsInput
    connect?: AiAgentWhereUniqueInput
    update?: XOR<XOR<AiAgentUpdateToOneWithWhereWithoutToolsInput, AiAgentUpdateWithoutToolsInput>, AiAgentUncheckedUpdateWithoutToolsInput>
  }

  export type AiToolUpdateOneRequiredWithoutAgentsNestedInput = {
    create?: XOR<AiToolCreateWithoutAgentsInput, AiToolUncheckedCreateWithoutAgentsInput>
    connectOrCreate?: AiToolCreateOrConnectWithoutAgentsInput
    upsert?: AiToolUpsertWithoutAgentsInput
    connect?: AiToolWhereUniqueInput
    update?: XOR<XOR<AiToolUpdateToOneWithWhereWithoutAgentsInput, AiToolUpdateWithoutAgentsInput>, AiToolUncheckedUpdateWithoutAgentsInput>
  }

  export type ScanTacticCreateNestedManyWithoutScanRunInput = {
    create?: XOR<ScanTacticCreateWithoutScanRunInput, ScanTacticUncheckedCreateWithoutScanRunInput> | ScanTacticCreateWithoutScanRunInput[] | ScanTacticUncheckedCreateWithoutScanRunInput[]
    connectOrCreate?: ScanTacticCreateOrConnectWithoutScanRunInput | ScanTacticCreateOrConnectWithoutScanRunInput[]
    createMany?: ScanTacticCreateManyScanRunInputEnvelope
    connect?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
  }

  export type ScanFindingCreateNestedManyWithoutScanRunInput = {
    create?: XOR<ScanFindingCreateWithoutScanRunInput, ScanFindingUncheckedCreateWithoutScanRunInput> | ScanFindingCreateWithoutScanRunInput[] | ScanFindingUncheckedCreateWithoutScanRunInput[]
    connectOrCreate?: ScanFindingCreateOrConnectWithoutScanRunInput | ScanFindingCreateOrConnectWithoutScanRunInput[]
    createMany?: ScanFindingCreateManyScanRunInputEnvelope
    connect?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
  }

  export type ScanAuditEntryCreateNestedManyWithoutScanRunInput = {
    create?: XOR<ScanAuditEntryCreateWithoutScanRunInput, ScanAuditEntryUncheckedCreateWithoutScanRunInput> | ScanAuditEntryCreateWithoutScanRunInput[] | ScanAuditEntryUncheckedCreateWithoutScanRunInput[]
    connectOrCreate?: ScanAuditEntryCreateOrConnectWithoutScanRunInput | ScanAuditEntryCreateOrConnectWithoutScanRunInput[]
    createMany?: ScanAuditEntryCreateManyScanRunInputEnvelope
    connect?: ScanAuditEntryWhereUniqueInput | ScanAuditEntryWhereUniqueInput[]
  }

  export type EscalationRouteCreateNestedManyWithoutScanRunInput = {
    create?: XOR<EscalationRouteCreateWithoutScanRunInput, EscalationRouteUncheckedCreateWithoutScanRunInput> | EscalationRouteCreateWithoutScanRunInput[] | EscalationRouteUncheckedCreateWithoutScanRunInput[]
    connectOrCreate?: EscalationRouteCreateOrConnectWithoutScanRunInput | EscalationRouteCreateOrConnectWithoutScanRunInput[]
    createMany?: EscalationRouteCreateManyScanRunInputEnvelope
    connect?: EscalationRouteWhereUniqueInput | EscalationRouteWhereUniqueInput[]
  }

  export type ScanTacticUncheckedCreateNestedManyWithoutScanRunInput = {
    create?: XOR<ScanTacticCreateWithoutScanRunInput, ScanTacticUncheckedCreateWithoutScanRunInput> | ScanTacticCreateWithoutScanRunInput[] | ScanTacticUncheckedCreateWithoutScanRunInput[]
    connectOrCreate?: ScanTacticCreateOrConnectWithoutScanRunInput | ScanTacticCreateOrConnectWithoutScanRunInput[]
    createMany?: ScanTacticCreateManyScanRunInputEnvelope
    connect?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
  }

  export type ScanFindingUncheckedCreateNestedManyWithoutScanRunInput = {
    create?: XOR<ScanFindingCreateWithoutScanRunInput, ScanFindingUncheckedCreateWithoutScanRunInput> | ScanFindingCreateWithoutScanRunInput[] | ScanFindingUncheckedCreateWithoutScanRunInput[]
    connectOrCreate?: ScanFindingCreateOrConnectWithoutScanRunInput | ScanFindingCreateOrConnectWithoutScanRunInput[]
    createMany?: ScanFindingCreateManyScanRunInputEnvelope
    connect?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
  }

  export type ScanAuditEntryUncheckedCreateNestedManyWithoutScanRunInput = {
    create?: XOR<ScanAuditEntryCreateWithoutScanRunInput, ScanAuditEntryUncheckedCreateWithoutScanRunInput> | ScanAuditEntryCreateWithoutScanRunInput[] | ScanAuditEntryUncheckedCreateWithoutScanRunInput[]
    connectOrCreate?: ScanAuditEntryCreateOrConnectWithoutScanRunInput | ScanAuditEntryCreateOrConnectWithoutScanRunInput[]
    createMany?: ScanAuditEntryCreateManyScanRunInputEnvelope
    connect?: ScanAuditEntryWhereUniqueInput | ScanAuditEntryWhereUniqueInput[]
  }

  export type EscalationRouteUncheckedCreateNestedManyWithoutScanRunInput = {
    create?: XOR<EscalationRouteCreateWithoutScanRunInput, EscalationRouteUncheckedCreateWithoutScanRunInput> | EscalationRouteCreateWithoutScanRunInput[] | EscalationRouteUncheckedCreateWithoutScanRunInput[]
    connectOrCreate?: EscalationRouteCreateOrConnectWithoutScanRunInput | EscalationRouteCreateOrConnectWithoutScanRunInput[]
    createMany?: EscalationRouteCreateManyScanRunInputEnvelope
    connect?: EscalationRouteWhereUniqueInput | EscalationRouteWhereUniqueInput[]
  }

  export type EnumScanRunStatusFieldUpdateOperationsInput = {
    set?: $Enums.ScanRunStatus
  }

  export type ScanTacticUpdateManyWithoutScanRunNestedInput = {
    create?: XOR<ScanTacticCreateWithoutScanRunInput, ScanTacticUncheckedCreateWithoutScanRunInput> | ScanTacticCreateWithoutScanRunInput[] | ScanTacticUncheckedCreateWithoutScanRunInput[]
    connectOrCreate?: ScanTacticCreateOrConnectWithoutScanRunInput | ScanTacticCreateOrConnectWithoutScanRunInput[]
    upsert?: ScanTacticUpsertWithWhereUniqueWithoutScanRunInput | ScanTacticUpsertWithWhereUniqueWithoutScanRunInput[]
    createMany?: ScanTacticCreateManyScanRunInputEnvelope
    set?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
    disconnect?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
    delete?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
    connect?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
    update?: ScanTacticUpdateWithWhereUniqueWithoutScanRunInput | ScanTacticUpdateWithWhereUniqueWithoutScanRunInput[]
    updateMany?: ScanTacticUpdateManyWithWhereWithoutScanRunInput | ScanTacticUpdateManyWithWhereWithoutScanRunInput[]
    deleteMany?: ScanTacticScalarWhereInput | ScanTacticScalarWhereInput[]
  }

  export type ScanFindingUpdateManyWithoutScanRunNestedInput = {
    create?: XOR<ScanFindingCreateWithoutScanRunInput, ScanFindingUncheckedCreateWithoutScanRunInput> | ScanFindingCreateWithoutScanRunInput[] | ScanFindingUncheckedCreateWithoutScanRunInput[]
    connectOrCreate?: ScanFindingCreateOrConnectWithoutScanRunInput | ScanFindingCreateOrConnectWithoutScanRunInput[]
    upsert?: ScanFindingUpsertWithWhereUniqueWithoutScanRunInput | ScanFindingUpsertWithWhereUniqueWithoutScanRunInput[]
    createMany?: ScanFindingCreateManyScanRunInputEnvelope
    set?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
    disconnect?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
    delete?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
    connect?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
    update?: ScanFindingUpdateWithWhereUniqueWithoutScanRunInput | ScanFindingUpdateWithWhereUniqueWithoutScanRunInput[]
    updateMany?: ScanFindingUpdateManyWithWhereWithoutScanRunInput | ScanFindingUpdateManyWithWhereWithoutScanRunInput[]
    deleteMany?: ScanFindingScalarWhereInput | ScanFindingScalarWhereInput[]
  }

  export type ScanAuditEntryUpdateManyWithoutScanRunNestedInput = {
    create?: XOR<ScanAuditEntryCreateWithoutScanRunInput, ScanAuditEntryUncheckedCreateWithoutScanRunInput> | ScanAuditEntryCreateWithoutScanRunInput[] | ScanAuditEntryUncheckedCreateWithoutScanRunInput[]
    connectOrCreate?: ScanAuditEntryCreateOrConnectWithoutScanRunInput | ScanAuditEntryCreateOrConnectWithoutScanRunInput[]
    upsert?: ScanAuditEntryUpsertWithWhereUniqueWithoutScanRunInput | ScanAuditEntryUpsertWithWhereUniqueWithoutScanRunInput[]
    createMany?: ScanAuditEntryCreateManyScanRunInputEnvelope
    set?: ScanAuditEntryWhereUniqueInput | ScanAuditEntryWhereUniqueInput[]
    disconnect?: ScanAuditEntryWhereUniqueInput | ScanAuditEntryWhereUniqueInput[]
    delete?: ScanAuditEntryWhereUniqueInput | ScanAuditEntryWhereUniqueInput[]
    connect?: ScanAuditEntryWhereUniqueInput | ScanAuditEntryWhereUniqueInput[]
    update?: ScanAuditEntryUpdateWithWhereUniqueWithoutScanRunInput | ScanAuditEntryUpdateWithWhereUniqueWithoutScanRunInput[]
    updateMany?: ScanAuditEntryUpdateManyWithWhereWithoutScanRunInput | ScanAuditEntryUpdateManyWithWhereWithoutScanRunInput[]
    deleteMany?: ScanAuditEntryScalarWhereInput | ScanAuditEntryScalarWhereInput[]
  }

  export type EscalationRouteUpdateManyWithoutScanRunNestedInput = {
    create?: XOR<EscalationRouteCreateWithoutScanRunInput, EscalationRouteUncheckedCreateWithoutScanRunInput> | EscalationRouteCreateWithoutScanRunInput[] | EscalationRouteUncheckedCreateWithoutScanRunInput[]
    connectOrCreate?: EscalationRouteCreateOrConnectWithoutScanRunInput | EscalationRouteCreateOrConnectWithoutScanRunInput[]
    upsert?: EscalationRouteUpsertWithWhereUniqueWithoutScanRunInput | EscalationRouteUpsertWithWhereUniqueWithoutScanRunInput[]
    createMany?: EscalationRouteCreateManyScanRunInputEnvelope
    set?: EscalationRouteWhereUniqueInput | EscalationRouteWhereUniqueInput[]
    disconnect?: EscalationRouteWhereUniqueInput | EscalationRouteWhereUniqueInput[]
    delete?: EscalationRouteWhereUniqueInput | EscalationRouteWhereUniqueInput[]
    connect?: EscalationRouteWhereUniqueInput | EscalationRouteWhereUniqueInput[]
    update?: EscalationRouteUpdateWithWhereUniqueWithoutScanRunInput | EscalationRouteUpdateWithWhereUniqueWithoutScanRunInput[]
    updateMany?: EscalationRouteUpdateManyWithWhereWithoutScanRunInput | EscalationRouteUpdateManyWithWhereWithoutScanRunInput[]
    deleteMany?: EscalationRouteScalarWhereInput | EscalationRouteScalarWhereInput[]
  }

  export type ScanTacticUncheckedUpdateManyWithoutScanRunNestedInput = {
    create?: XOR<ScanTacticCreateWithoutScanRunInput, ScanTacticUncheckedCreateWithoutScanRunInput> | ScanTacticCreateWithoutScanRunInput[] | ScanTacticUncheckedCreateWithoutScanRunInput[]
    connectOrCreate?: ScanTacticCreateOrConnectWithoutScanRunInput | ScanTacticCreateOrConnectWithoutScanRunInput[]
    upsert?: ScanTacticUpsertWithWhereUniqueWithoutScanRunInput | ScanTacticUpsertWithWhereUniqueWithoutScanRunInput[]
    createMany?: ScanTacticCreateManyScanRunInputEnvelope
    set?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
    disconnect?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
    delete?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
    connect?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
    update?: ScanTacticUpdateWithWhereUniqueWithoutScanRunInput | ScanTacticUpdateWithWhereUniqueWithoutScanRunInput[]
    updateMany?: ScanTacticUpdateManyWithWhereWithoutScanRunInput | ScanTacticUpdateManyWithWhereWithoutScanRunInput[]
    deleteMany?: ScanTacticScalarWhereInput | ScanTacticScalarWhereInput[]
  }

  export type ScanFindingUncheckedUpdateManyWithoutScanRunNestedInput = {
    create?: XOR<ScanFindingCreateWithoutScanRunInput, ScanFindingUncheckedCreateWithoutScanRunInput> | ScanFindingCreateWithoutScanRunInput[] | ScanFindingUncheckedCreateWithoutScanRunInput[]
    connectOrCreate?: ScanFindingCreateOrConnectWithoutScanRunInput | ScanFindingCreateOrConnectWithoutScanRunInput[]
    upsert?: ScanFindingUpsertWithWhereUniqueWithoutScanRunInput | ScanFindingUpsertWithWhereUniqueWithoutScanRunInput[]
    createMany?: ScanFindingCreateManyScanRunInputEnvelope
    set?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
    disconnect?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
    delete?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
    connect?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
    update?: ScanFindingUpdateWithWhereUniqueWithoutScanRunInput | ScanFindingUpdateWithWhereUniqueWithoutScanRunInput[]
    updateMany?: ScanFindingUpdateManyWithWhereWithoutScanRunInput | ScanFindingUpdateManyWithWhereWithoutScanRunInput[]
    deleteMany?: ScanFindingScalarWhereInput | ScanFindingScalarWhereInput[]
  }

  export type ScanAuditEntryUncheckedUpdateManyWithoutScanRunNestedInput = {
    create?: XOR<ScanAuditEntryCreateWithoutScanRunInput, ScanAuditEntryUncheckedCreateWithoutScanRunInput> | ScanAuditEntryCreateWithoutScanRunInput[] | ScanAuditEntryUncheckedCreateWithoutScanRunInput[]
    connectOrCreate?: ScanAuditEntryCreateOrConnectWithoutScanRunInput | ScanAuditEntryCreateOrConnectWithoutScanRunInput[]
    upsert?: ScanAuditEntryUpsertWithWhereUniqueWithoutScanRunInput | ScanAuditEntryUpsertWithWhereUniqueWithoutScanRunInput[]
    createMany?: ScanAuditEntryCreateManyScanRunInputEnvelope
    set?: ScanAuditEntryWhereUniqueInput | ScanAuditEntryWhereUniqueInput[]
    disconnect?: ScanAuditEntryWhereUniqueInput | ScanAuditEntryWhereUniqueInput[]
    delete?: ScanAuditEntryWhereUniqueInput | ScanAuditEntryWhereUniqueInput[]
    connect?: ScanAuditEntryWhereUniqueInput | ScanAuditEntryWhereUniqueInput[]
    update?: ScanAuditEntryUpdateWithWhereUniqueWithoutScanRunInput | ScanAuditEntryUpdateWithWhereUniqueWithoutScanRunInput[]
    updateMany?: ScanAuditEntryUpdateManyWithWhereWithoutScanRunInput | ScanAuditEntryUpdateManyWithWhereWithoutScanRunInput[]
    deleteMany?: ScanAuditEntryScalarWhereInput | ScanAuditEntryScalarWhereInput[]
  }

  export type EscalationRouteUncheckedUpdateManyWithoutScanRunNestedInput = {
    create?: XOR<EscalationRouteCreateWithoutScanRunInput, EscalationRouteUncheckedCreateWithoutScanRunInput> | EscalationRouteCreateWithoutScanRunInput[] | EscalationRouteUncheckedCreateWithoutScanRunInput[]
    connectOrCreate?: EscalationRouteCreateOrConnectWithoutScanRunInput | EscalationRouteCreateOrConnectWithoutScanRunInput[]
    upsert?: EscalationRouteUpsertWithWhereUniqueWithoutScanRunInput | EscalationRouteUpsertWithWhereUniqueWithoutScanRunInput[]
    createMany?: EscalationRouteCreateManyScanRunInputEnvelope
    set?: EscalationRouteWhereUniqueInput | EscalationRouteWhereUniqueInput[]
    disconnect?: EscalationRouteWhereUniqueInput | EscalationRouteWhereUniqueInput[]
    delete?: EscalationRouteWhereUniqueInput | EscalationRouteWhereUniqueInput[]
    connect?: EscalationRouteWhereUniqueInput | EscalationRouteWhereUniqueInput[]
    update?: EscalationRouteUpdateWithWhereUniqueWithoutScanRunInput | EscalationRouteUpdateWithWhereUniqueWithoutScanRunInput[]
    updateMany?: EscalationRouteUpdateManyWithWhereWithoutScanRunInput | EscalationRouteUpdateManyWithWhereWithoutScanRunInput[]
    deleteMany?: EscalationRouteScalarWhereInput | EscalationRouteScalarWhereInput[]
  }

  export type ScanRunCreateNestedOneWithoutScanTacticsInput = {
    create?: XOR<ScanRunCreateWithoutScanTacticsInput, ScanRunUncheckedCreateWithoutScanTacticsInput>
    connectOrCreate?: ScanRunCreateOrConnectWithoutScanTacticsInput
    connect?: ScanRunWhereUniqueInput
  }

  export type ScanTacticCreateNestedOneWithoutChildTacticsInput = {
    create?: XOR<ScanTacticCreateWithoutChildTacticsInput, ScanTacticUncheckedCreateWithoutChildTacticsInput>
    connectOrCreate?: ScanTacticCreateOrConnectWithoutChildTacticsInput
    connect?: ScanTacticWhereUniqueInput
  }

  export type ScanTacticCreateNestedManyWithoutParentTacticInput = {
    create?: XOR<ScanTacticCreateWithoutParentTacticInput, ScanTacticUncheckedCreateWithoutParentTacticInput> | ScanTacticCreateWithoutParentTacticInput[] | ScanTacticUncheckedCreateWithoutParentTacticInput[]
    connectOrCreate?: ScanTacticCreateOrConnectWithoutParentTacticInput | ScanTacticCreateOrConnectWithoutParentTacticInput[]
    createMany?: ScanTacticCreateManyParentTacticInputEnvelope
    connect?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
  }

  export type ScanFindingCreateNestedManyWithoutScanTacticInput = {
    create?: XOR<ScanFindingCreateWithoutScanTacticInput, ScanFindingUncheckedCreateWithoutScanTacticInput> | ScanFindingCreateWithoutScanTacticInput[] | ScanFindingUncheckedCreateWithoutScanTacticInput[]
    connectOrCreate?: ScanFindingCreateOrConnectWithoutScanTacticInput | ScanFindingCreateOrConnectWithoutScanTacticInput[]
    createMany?: ScanFindingCreateManyScanTacticInputEnvelope
    connect?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
  }

  export type ScanTacticUncheckedCreateNestedManyWithoutParentTacticInput = {
    create?: XOR<ScanTacticCreateWithoutParentTacticInput, ScanTacticUncheckedCreateWithoutParentTacticInput> | ScanTacticCreateWithoutParentTacticInput[] | ScanTacticUncheckedCreateWithoutParentTacticInput[]
    connectOrCreate?: ScanTacticCreateOrConnectWithoutParentTacticInput | ScanTacticCreateOrConnectWithoutParentTacticInput[]
    createMany?: ScanTacticCreateManyParentTacticInputEnvelope
    connect?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
  }

  export type ScanFindingUncheckedCreateNestedManyWithoutScanTacticInput = {
    create?: XOR<ScanFindingCreateWithoutScanTacticInput, ScanFindingUncheckedCreateWithoutScanTacticInput> | ScanFindingCreateWithoutScanTacticInput[] | ScanFindingUncheckedCreateWithoutScanTacticInput[]
    connectOrCreate?: ScanFindingCreateOrConnectWithoutScanTacticInput | ScanFindingCreateOrConnectWithoutScanTacticInput[]
    createMany?: ScanFindingCreateManyScanTacticInputEnvelope
    connect?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type EnumScanTacticStatusFieldUpdateOperationsInput = {
    set?: $Enums.ScanTacticStatus
  }

  export type ScanRunUpdateOneRequiredWithoutScanTacticsNestedInput = {
    create?: XOR<ScanRunCreateWithoutScanTacticsInput, ScanRunUncheckedCreateWithoutScanTacticsInput>
    connectOrCreate?: ScanRunCreateOrConnectWithoutScanTacticsInput
    upsert?: ScanRunUpsertWithoutScanTacticsInput
    connect?: ScanRunWhereUniqueInput
    update?: XOR<XOR<ScanRunUpdateToOneWithWhereWithoutScanTacticsInput, ScanRunUpdateWithoutScanTacticsInput>, ScanRunUncheckedUpdateWithoutScanTacticsInput>
  }

  export type ScanTacticUpdateOneWithoutChildTacticsNestedInput = {
    create?: XOR<ScanTacticCreateWithoutChildTacticsInput, ScanTacticUncheckedCreateWithoutChildTacticsInput>
    connectOrCreate?: ScanTacticCreateOrConnectWithoutChildTacticsInput
    upsert?: ScanTacticUpsertWithoutChildTacticsInput
    disconnect?: ScanTacticWhereInput | boolean
    delete?: ScanTacticWhereInput | boolean
    connect?: ScanTacticWhereUniqueInput
    update?: XOR<XOR<ScanTacticUpdateToOneWithWhereWithoutChildTacticsInput, ScanTacticUpdateWithoutChildTacticsInput>, ScanTacticUncheckedUpdateWithoutChildTacticsInput>
  }

  export type ScanTacticUpdateManyWithoutParentTacticNestedInput = {
    create?: XOR<ScanTacticCreateWithoutParentTacticInput, ScanTacticUncheckedCreateWithoutParentTacticInput> | ScanTacticCreateWithoutParentTacticInput[] | ScanTacticUncheckedCreateWithoutParentTacticInput[]
    connectOrCreate?: ScanTacticCreateOrConnectWithoutParentTacticInput | ScanTacticCreateOrConnectWithoutParentTacticInput[]
    upsert?: ScanTacticUpsertWithWhereUniqueWithoutParentTacticInput | ScanTacticUpsertWithWhereUniqueWithoutParentTacticInput[]
    createMany?: ScanTacticCreateManyParentTacticInputEnvelope
    set?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
    disconnect?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
    delete?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
    connect?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
    update?: ScanTacticUpdateWithWhereUniqueWithoutParentTacticInput | ScanTacticUpdateWithWhereUniqueWithoutParentTacticInput[]
    updateMany?: ScanTacticUpdateManyWithWhereWithoutParentTacticInput | ScanTacticUpdateManyWithWhereWithoutParentTacticInput[]
    deleteMany?: ScanTacticScalarWhereInput | ScanTacticScalarWhereInput[]
  }

  export type ScanFindingUpdateManyWithoutScanTacticNestedInput = {
    create?: XOR<ScanFindingCreateWithoutScanTacticInput, ScanFindingUncheckedCreateWithoutScanTacticInput> | ScanFindingCreateWithoutScanTacticInput[] | ScanFindingUncheckedCreateWithoutScanTacticInput[]
    connectOrCreate?: ScanFindingCreateOrConnectWithoutScanTacticInput | ScanFindingCreateOrConnectWithoutScanTacticInput[]
    upsert?: ScanFindingUpsertWithWhereUniqueWithoutScanTacticInput | ScanFindingUpsertWithWhereUniqueWithoutScanTacticInput[]
    createMany?: ScanFindingCreateManyScanTacticInputEnvelope
    set?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
    disconnect?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
    delete?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
    connect?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
    update?: ScanFindingUpdateWithWhereUniqueWithoutScanTacticInput | ScanFindingUpdateWithWhereUniqueWithoutScanTacticInput[]
    updateMany?: ScanFindingUpdateManyWithWhereWithoutScanTacticInput | ScanFindingUpdateManyWithWhereWithoutScanTacticInput[]
    deleteMany?: ScanFindingScalarWhereInput | ScanFindingScalarWhereInput[]
  }

  export type ScanTacticUncheckedUpdateManyWithoutParentTacticNestedInput = {
    create?: XOR<ScanTacticCreateWithoutParentTacticInput, ScanTacticUncheckedCreateWithoutParentTacticInput> | ScanTacticCreateWithoutParentTacticInput[] | ScanTacticUncheckedCreateWithoutParentTacticInput[]
    connectOrCreate?: ScanTacticCreateOrConnectWithoutParentTacticInput | ScanTacticCreateOrConnectWithoutParentTacticInput[]
    upsert?: ScanTacticUpsertWithWhereUniqueWithoutParentTacticInput | ScanTacticUpsertWithWhereUniqueWithoutParentTacticInput[]
    createMany?: ScanTacticCreateManyParentTacticInputEnvelope
    set?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
    disconnect?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
    delete?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
    connect?: ScanTacticWhereUniqueInput | ScanTacticWhereUniqueInput[]
    update?: ScanTacticUpdateWithWhereUniqueWithoutParentTacticInput | ScanTacticUpdateWithWhereUniqueWithoutParentTacticInput[]
    updateMany?: ScanTacticUpdateManyWithWhereWithoutParentTacticInput | ScanTacticUpdateManyWithWhereWithoutParentTacticInput[]
    deleteMany?: ScanTacticScalarWhereInput | ScanTacticScalarWhereInput[]
  }

  export type ScanFindingUncheckedUpdateManyWithoutScanTacticNestedInput = {
    create?: XOR<ScanFindingCreateWithoutScanTacticInput, ScanFindingUncheckedCreateWithoutScanTacticInput> | ScanFindingCreateWithoutScanTacticInput[] | ScanFindingUncheckedCreateWithoutScanTacticInput[]
    connectOrCreate?: ScanFindingCreateOrConnectWithoutScanTacticInput | ScanFindingCreateOrConnectWithoutScanTacticInput[]
    upsert?: ScanFindingUpsertWithWhereUniqueWithoutScanTacticInput | ScanFindingUpsertWithWhereUniqueWithoutScanTacticInput[]
    createMany?: ScanFindingCreateManyScanTacticInputEnvelope
    set?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
    disconnect?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
    delete?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
    connect?: ScanFindingWhereUniqueInput | ScanFindingWhereUniqueInput[]
    update?: ScanFindingUpdateWithWhereUniqueWithoutScanTacticInput | ScanFindingUpdateWithWhereUniqueWithoutScanTacticInput[]
    updateMany?: ScanFindingUpdateManyWithWhereWithoutScanTacticInput | ScanFindingUpdateManyWithWhereWithoutScanTacticInput[]
    deleteMany?: ScanFindingScalarWhereInput | ScanFindingScalarWhereInput[]
  }

  export type ScanRunCreateNestedOneWithoutScanFindingsInput = {
    create?: XOR<ScanRunCreateWithoutScanFindingsInput, ScanRunUncheckedCreateWithoutScanFindingsInput>
    connectOrCreate?: ScanRunCreateOrConnectWithoutScanFindingsInput
    connect?: ScanRunWhereUniqueInput
  }

  export type ScanTacticCreateNestedOneWithoutScanFindingsInput = {
    create?: XOR<ScanTacticCreateWithoutScanFindingsInput, ScanTacticUncheckedCreateWithoutScanFindingsInput>
    connectOrCreate?: ScanTacticCreateOrConnectWithoutScanFindingsInput
    connect?: ScanTacticWhereUniqueInput
  }

  export type EscalationRouteFindingCreateNestedManyWithoutScanFindingInput = {
    create?: XOR<EscalationRouteFindingCreateWithoutScanFindingInput, EscalationRouteFindingUncheckedCreateWithoutScanFindingInput> | EscalationRouteFindingCreateWithoutScanFindingInput[] | EscalationRouteFindingUncheckedCreateWithoutScanFindingInput[]
    connectOrCreate?: EscalationRouteFindingCreateOrConnectWithoutScanFindingInput | EscalationRouteFindingCreateOrConnectWithoutScanFindingInput[]
    createMany?: EscalationRouteFindingCreateManyScanFindingInputEnvelope
    connect?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
  }

  export type EscalationRouteFindingUncheckedCreateNestedManyWithoutScanFindingInput = {
    create?: XOR<EscalationRouteFindingCreateWithoutScanFindingInput, EscalationRouteFindingUncheckedCreateWithoutScanFindingInput> | EscalationRouteFindingCreateWithoutScanFindingInput[] | EscalationRouteFindingUncheckedCreateWithoutScanFindingInput[]
    connectOrCreate?: EscalationRouteFindingCreateOrConnectWithoutScanFindingInput | EscalationRouteFindingCreateOrConnectWithoutScanFindingInput[]
    createMany?: EscalationRouteFindingCreateManyScanFindingInputEnvelope
    connect?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type ScanRunUpdateOneRequiredWithoutScanFindingsNestedInput = {
    create?: XOR<ScanRunCreateWithoutScanFindingsInput, ScanRunUncheckedCreateWithoutScanFindingsInput>
    connectOrCreate?: ScanRunCreateOrConnectWithoutScanFindingsInput
    upsert?: ScanRunUpsertWithoutScanFindingsInput
    connect?: ScanRunWhereUniqueInput
    update?: XOR<XOR<ScanRunUpdateToOneWithWhereWithoutScanFindingsInput, ScanRunUpdateWithoutScanFindingsInput>, ScanRunUncheckedUpdateWithoutScanFindingsInput>
  }

  export type ScanTacticUpdateOneRequiredWithoutScanFindingsNestedInput = {
    create?: XOR<ScanTacticCreateWithoutScanFindingsInput, ScanTacticUncheckedCreateWithoutScanFindingsInput>
    connectOrCreate?: ScanTacticCreateOrConnectWithoutScanFindingsInput
    upsert?: ScanTacticUpsertWithoutScanFindingsInput
    connect?: ScanTacticWhereUniqueInput
    update?: XOR<XOR<ScanTacticUpdateToOneWithWhereWithoutScanFindingsInput, ScanTacticUpdateWithoutScanFindingsInput>, ScanTacticUncheckedUpdateWithoutScanFindingsInput>
  }

  export type EscalationRouteFindingUpdateManyWithoutScanFindingNestedInput = {
    create?: XOR<EscalationRouteFindingCreateWithoutScanFindingInput, EscalationRouteFindingUncheckedCreateWithoutScanFindingInput> | EscalationRouteFindingCreateWithoutScanFindingInput[] | EscalationRouteFindingUncheckedCreateWithoutScanFindingInput[]
    connectOrCreate?: EscalationRouteFindingCreateOrConnectWithoutScanFindingInput | EscalationRouteFindingCreateOrConnectWithoutScanFindingInput[]
    upsert?: EscalationRouteFindingUpsertWithWhereUniqueWithoutScanFindingInput | EscalationRouteFindingUpsertWithWhereUniqueWithoutScanFindingInput[]
    createMany?: EscalationRouteFindingCreateManyScanFindingInputEnvelope
    set?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
    disconnect?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
    delete?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
    connect?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
    update?: EscalationRouteFindingUpdateWithWhereUniqueWithoutScanFindingInput | EscalationRouteFindingUpdateWithWhereUniqueWithoutScanFindingInput[]
    updateMany?: EscalationRouteFindingUpdateManyWithWhereWithoutScanFindingInput | EscalationRouteFindingUpdateManyWithWhereWithoutScanFindingInput[]
    deleteMany?: EscalationRouteFindingScalarWhereInput | EscalationRouteFindingScalarWhereInput[]
  }

  export type EscalationRouteFindingUncheckedUpdateManyWithoutScanFindingNestedInput = {
    create?: XOR<EscalationRouteFindingCreateWithoutScanFindingInput, EscalationRouteFindingUncheckedCreateWithoutScanFindingInput> | EscalationRouteFindingCreateWithoutScanFindingInput[] | EscalationRouteFindingUncheckedCreateWithoutScanFindingInput[]
    connectOrCreate?: EscalationRouteFindingCreateOrConnectWithoutScanFindingInput | EscalationRouteFindingCreateOrConnectWithoutScanFindingInput[]
    upsert?: EscalationRouteFindingUpsertWithWhereUniqueWithoutScanFindingInput | EscalationRouteFindingUpsertWithWhereUniqueWithoutScanFindingInput[]
    createMany?: EscalationRouteFindingCreateManyScanFindingInputEnvelope
    set?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
    disconnect?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
    delete?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
    connect?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
    update?: EscalationRouteFindingUpdateWithWhereUniqueWithoutScanFindingInput | EscalationRouteFindingUpdateWithWhereUniqueWithoutScanFindingInput[]
    updateMany?: EscalationRouteFindingUpdateManyWithWhereWithoutScanFindingInput | EscalationRouteFindingUpdateManyWithWhereWithoutScanFindingInput[]
    deleteMany?: EscalationRouteFindingScalarWhereInput | EscalationRouteFindingScalarWhereInput[]
  }

  export type ScanRunCreateNestedOneWithoutScanAuditEntriesInput = {
    create?: XOR<ScanRunCreateWithoutScanAuditEntriesInput, ScanRunUncheckedCreateWithoutScanAuditEntriesInput>
    connectOrCreate?: ScanRunCreateOrConnectWithoutScanAuditEntriesInput
    connect?: ScanRunWhereUniqueInput
  }

  export type ScanRunUpdateOneRequiredWithoutScanAuditEntriesNestedInput = {
    create?: XOR<ScanRunCreateWithoutScanAuditEntriesInput, ScanRunUncheckedCreateWithoutScanAuditEntriesInput>
    connectOrCreate?: ScanRunCreateOrConnectWithoutScanAuditEntriesInput
    upsert?: ScanRunUpsertWithoutScanAuditEntriesInput
    connect?: ScanRunWhereUniqueInput
    update?: XOR<XOR<ScanRunUpdateToOneWithWhereWithoutScanAuditEntriesInput, ScanRunUpdateWithoutScanAuditEntriesInput>, ScanRunUncheckedUpdateWithoutScanAuditEntriesInput>
  }

  export type ScanRunCreateNestedOneWithoutEscalationRoutesInput = {
    create?: XOR<ScanRunCreateWithoutEscalationRoutesInput, ScanRunUncheckedCreateWithoutEscalationRoutesInput>
    connectOrCreate?: ScanRunCreateOrConnectWithoutEscalationRoutesInput
    connect?: ScanRunWhereUniqueInput
  }

  export type EscalationRouteFindingCreateNestedManyWithoutEscalationRouteInput = {
    create?: XOR<EscalationRouteFindingCreateWithoutEscalationRouteInput, EscalationRouteFindingUncheckedCreateWithoutEscalationRouteInput> | EscalationRouteFindingCreateWithoutEscalationRouteInput[] | EscalationRouteFindingUncheckedCreateWithoutEscalationRouteInput[]
    connectOrCreate?: EscalationRouteFindingCreateOrConnectWithoutEscalationRouteInput | EscalationRouteFindingCreateOrConnectWithoutEscalationRouteInput[]
    createMany?: EscalationRouteFindingCreateManyEscalationRouteInputEnvelope
    connect?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
  }

  export type EscalationRouteFindingUncheckedCreateNestedManyWithoutEscalationRouteInput = {
    create?: XOR<EscalationRouteFindingCreateWithoutEscalationRouteInput, EscalationRouteFindingUncheckedCreateWithoutEscalationRouteInput> | EscalationRouteFindingCreateWithoutEscalationRouteInput[] | EscalationRouteFindingUncheckedCreateWithoutEscalationRouteInput[]
    connectOrCreate?: EscalationRouteFindingCreateOrConnectWithoutEscalationRouteInput | EscalationRouteFindingCreateOrConnectWithoutEscalationRouteInput[]
    createMany?: EscalationRouteFindingCreateManyEscalationRouteInputEnvelope
    connect?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
  }

  export type ScanRunUpdateOneRequiredWithoutEscalationRoutesNestedInput = {
    create?: XOR<ScanRunCreateWithoutEscalationRoutesInput, ScanRunUncheckedCreateWithoutEscalationRoutesInput>
    connectOrCreate?: ScanRunCreateOrConnectWithoutEscalationRoutesInput
    upsert?: ScanRunUpsertWithoutEscalationRoutesInput
    connect?: ScanRunWhereUniqueInput
    update?: XOR<XOR<ScanRunUpdateToOneWithWhereWithoutEscalationRoutesInput, ScanRunUpdateWithoutEscalationRoutesInput>, ScanRunUncheckedUpdateWithoutEscalationRoutesInput>
  }

  export type EscalationRouteFindingUpdateManyWithoutEscalationRouteNestedInput = {
    create?: XOR<EscalationRouteFindingCreateWithoutEscalationRouteInput, EscalationRouteFindingUncheckedCreateWithoutEscalationRouteInput> | EscalationRouteFindingCreateWithoutEscalationRouteInput[] | EscalationRouteFindingUncheckedCreateWithoutEscalationRouteInput[]
    connectOrCreate?: EscalationRouteFindingCreateOrConnectWithoutEscalationRouteInput | EscalationRouteFindingCreateOrConnectWithoutEscalationRouteInput[]
    upsert?: EscalationRouteFindingUpsertWithWhereUniqueWithoutEscalationRouteInput | EscalationRouteFindingUpsertWithWhereUniqueWithoutEscalationRouteInput[]
    createMany?: EscalationRouteFindingCreateManyEscalationRouteInputEnvelope
    set?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
    disconnect?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
    delete?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
    connect?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
    update?: EscalationRouteFindingUpdateWithWhereUniqueWithoutEscalationRouteInput | EscalationRouteFindingUpdateWithWhereUniqueWithoutEscalationRouteInput[]
    updateMany?: EscalationRouteFindingUpdateManyWithWhereWithoutEscalationRouteInput | EscalationRouteFindingUpdateManyWithWhereWithoutEscalationRouteInput[]
    deleteMany?: EscalationRouteFindingScalarWhereInput | EscalationRouteFindingScalarWhereInput[]
  }

  export type EscalationRouteFindingUncheckedUpdateManyWithoutEscalationRouteNestedInput = {
    create?: XOR<EscalationRouteFindingCreateWithoutEscalationRouteInput, EscalationRouteFindingUncheckedCreateWithoutEscalationRouteInput> | EscalationRouteFindingCreateWithoutEscalationRouteInput[] | EscalationRouteFindingUncheckedCreateWithoutEscalationRouteInput[]
    connectOrCreate?: EscalationRouteFindingCreateOrConnectWithoutEscalationRouteInput | EscalationRouteFindingCreateOrConnectWithoutEscalationRouteInput[]
    upsert?: EscalationRouteFindingUpsertWithWhereUniqueWithoutEscalationRouteInput | EscalationRouteFindingUpsertWithWhereUniqueWithoutEscalationRouteInput[]
    createMany?: EscalationRouteFindingCreateManyEscalationRouteInputEnvelope
    set?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
    disconnect?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
    delete?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
    connect?: EscalationRouteFindingWhereUniqueInput | EscalationRouteFindingWhereUniqueInput[]
    update?: EscalationRouteFindingUpdateWithWhereUniqueWithoutEscalationRouteInput | EscalationRouteFindingUpdateWithWhereUniqueWithoutEscalationRouteInput[]
    updateMany?: EscalationRouteFindingUpdateManyWithWhereWithoutEscalationRouteInput | EscalationRouteFindingUpdateManyWithWhereWithoutEscalationRouteInput[]
    deleteMany?: EscalationRouteFindingScalarWhereInput | EscalationRouteFindingScalarWhereInput[]
  }

  export type EscalationRouteCreateNestedOneWithoutRouteFindingsInput = {
    create?: XOR<EscalationRouteCreateWithoutRouteFindingsInput, EscalationRouteUncheckedCreateWithoutRouteFindingsInput>
    connectOrCreate?: EscalationRouteCreateOrConnectWithoutRouteFindingsInput
    connect?: EscalationRouteWhereUniqueInput
  }

  export type ScanFindingCreateNestedOneWithoutRouteFindingsInput = {
    create?: XOR<ScanFindingCreateWithoutRouteFindingsInput, ScanFindingUncheckedCreateWithoutRouteFindingsInput>
    connectOrCreate?: ScanFindingCreateOrConnectWithoutRouteFindingsInput
    connect?: ScanFindingWhereUniqueInput
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type EscalationRouteUpdateOneRequiredWithoutRouteFindingsNestedInput = {
    create?: XOR<EscalationRouteCreateWithoutRouteFindingsInput, EscalationRouteUncheckedCreateWithoutRouteFindingsInput>
    connectOrCreate?: EscalationRouteCreateOrConnectWithoutRouteFindingsInput
    upsert?: EscalationRouteUpsertWithoutRouteFindingsInput
    connect?: EscalationRouteWhereUniqueInput
    update?: XOR<XOR<EscalationRouteUpdateToOneWithWhereWithoutRouteFindingsInput, EscalationRouteUpdateWithoutRouteFindingsInput>, EscalationRouteUncheckedUpdateWithoutRouteFindingsInput>
  }

  export type ScanFindingUpdateOneRequiredWithoutRouteFindingsNestedInput = {
    create?: XOR<ScanFindingCreateWithoutRouteFindingsInput, ScanFindingUncheckedCreateWithoutRouteFindingsInput>
    connectOrCreate?: ScanFindingCreateOrConnectWithoutRouteFindingsInput
    upsert?: ScanFindingUpsertWithoutRouteFindingsInput
    connect?: ScanFindingWhereUniqueInput
    update?: XOR<XOR<ScanFindingUpdateToOneWithWhereWithoutRouteFindingsInput, ScanFindingUpdateWithoutRouteFindingsInput>, ScanFindingUncheckedUpdateWithoutRouteFindingsInput>
  }

  export type NestedUuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumApplicationEnvironmentFilter<$PrismaModel = never> = {
    equals?: $Enums.ApplicationEnvironment | EnumApplicationEnvironmentFieldRefInput<$PrismaModel>
    in?: $Enums.ApplicationEnvironment[] | ListEnumApplicationEnvironmentFieldRefInput<$PrismaModel>
    notIn?: $Enums.ApplicationEnvironment[] | ListEnumApplicationEnvironmentFieldRefInput<$PrismaModel>
    not?: NestedEnumApplicationEnvironmentFilter<$PrismaModel> | $Enums.ApplicationEnvironment
  }

  export type NestedEnumApplicationStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ApplicationStatus | EnumApplicationStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ApplicationStatus[] | ListEnumApplicationStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ApplicationStatus[] | ListEnumApplicationStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumApplicationStatusFilter<$PrismaModel> | $Enums.ApplicationStatus
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedUuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumApplicationEnvironmentWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ApplicationEnvironment | EnumApplicationEnvironmentFieldRefInput<$PrismaModel>
    in?: $Enums.ApplicationEnvironment[] | ListEnumApplicationEnvironmentFieldRefInput<$PrismaModel>
    notIn?: $Enums.ApplicationEnvironment[] | ListEnumApplicationEnvironmentFieldRefInput<$PrismaModel>
    not?: NestedEnumApplicationEnvironmentWithAggregatesFilter<$PrismaModel> | $Enums.ApplicationEnvironment
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumApplicationEnvironmentFilter<$PrismaModel>
    _max?: NestedEnumApplicationEnvironmentFilter<$PrismaModel>
  }

  export type NestedEnumApplicationStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ApplicationStatus | EnumApplicationStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ApplicationStatus[] | ListEnumApplicationStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ApplicationStatus[] | ListEnumApplicationStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumApplicationStatusWithAggregatesFilter<$PrismaModel> | $Enums.ApplicationStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumApplicationStatusFilter<$PrismaModel>
    _max?: NestedEnumApplicationStatusFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedEnumRuntimeServiceTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.RuntimeServiceType | EnumRuntimeServiceTypeFieldRefInput<$PrismaModel>
    in?: $Enums.RuntimeServiceType[] | ListEnumRuntimeServiceTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.RuntimeServiceType[] | ListEnumRuntimeServiceTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumRuntimeServiceTypeFilter<$PrismaModel> | $Enums.RuntimeServiceType
  }

  export type NestedEnumRuntimeProviderFilter<$PrismaModel = never> = {
    equals?: $Enums.RuntimeProvider | EnumRuntimeProviderFieldRefInput<$PrismaModel>
    in?: $Enums.RuntimeProvider[] | ListEnumRuntimeProviderFieldRefInput<$PrismaModel>
    notIn?: $Enums.RuntimeProvider[] | ListEnumRuntimeProviderFieldRefInput<$PrismaModel>
    not?: NestedEnumRuntimeProviderFilter<$PrismaModel> | $Enums.RuntimeProvider
  }

  export type NestedEnumRuntimeStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.RuntimeStatus | EnumRuntimeStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RuntimeStatus[] | ListEnumRuntimeStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RuntimeStatus[] | ListEnumRuntimeStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRuntimeStatusFilter<$PrismaModel> | $Enums.RuntimeStatus
  }

  export type NestedUuidNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumRuntimeServiceTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RuntimeServiceType | EnumRuntimeServiceTypeFieldRefInput<$PrismaModel>
    in?: $Enums.RuntimeServiceType[] | ListEnumRuntimeServiceTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.RuntimeServiceType[] | ListEnumRuntimeServiceTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumRuntimeServiceTypeWithAggregatesFilter<$PrismaModel> | $Enums.RuntimeServiceType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRuntimeServiceTypeFilter<$PrismaModel>
    _max?: NestedEnumRuntimeServiceTypeFilter<$PrismaModel>
  }

  export type NestedEnumRuntimeProviderWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RuntimeProvider | EnumRuntimeProviderFieldRefInput<$PrismaModel>
    in?: $Enums.RuntimeProvider[] | ListEnumRuntimeProviderFieldRefInput<$PrismaModel>
    notIn?: $Enums.RuntimeProvider[] | ListEnumRuntimeProviderFieldRefInput<$PrismaModel>
    not?: NestedEnumRuntimeProviderWithAggregatesFilter<$PrismaModel> | $Enums.RuntimeProvider
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRuntimeProviderFilter<$PrismaModel>
    _max?: NestedEnumRuntimeProviderFilter<$PrismaModel>
  }

  export type NestedEnumRuntimeStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RuntimeStatus | EnumRuntimeStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RuntimeStatus[] | ListEnumRuntimeStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RuntimeStatus[] | ListEnumRuntimeStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRuntimeStatusWithAggregatesFilter<$PrismaModel> | $Enums.RuntimeStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRuntimeStatusFilter<$PrismaModel>
    _max?: NestedEnumRuntimeStatusFilter<$PrismaModel>
  }

  export type NestedUuidNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedEnumAiProviderKindFilter<$PrismaModel = never> = {
    equals?: $Enums.AiProviderKind | EnumAiProviderKindFieldRefInput<$PrismaModel>
    in?: $Enums.AiProviderKind[] | ListEnumAiProviderKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiProviderKind[] | ListEnumAiProviderKindFieldRefInput<$PrismaModel>
    not?: NestedEnumAiProviderKindFilter<$PrismaModel> | $Enums.AiProviderKind
  }

  export type NestedEnumAiProviderStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.AiProviderStatus | EnumAiProviderStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AiProviderStatus[] | ListEnumAiProviderStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiProviderStatus[] | ListEnumAiProviderStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAiProviderStatusFilter<$PrismaModel> | $Enums.AiProviderStatus
  }

  export type NestedEnumAiProviderKindWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AiProviderKind | EnumAiProviderKindFieldRefInput<$PrismaModel>
    in?: $Enums.AiProviderKind[] | ListEnumAiProviderKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiProviderKind[] | ListEnumAiProviderKindFieldRefInput<$PrismaModel>
    not?: NestedEnumAiProviderKindWithAggregatesFilter<$PrismaModel> | $Enums.AiProviderKind
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAiProviderKindFilter<$PrismaModel>
    _max?: NestedEnumAiProviderKindFilter<$PrismaModel>
  }

  export type NestedEnumAiProviderStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AiProviderStatus | EnumAiProviderStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AiProviderStatus[] | ListEnumAiProviderStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiProviderStatus[] | ListEnumAiProviderStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAiProviderStatusWithAggregatesFilter<$PrismaModel> | $Enums.AiProviderStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAiProviderStatusFilter<$PrismaModel>
    _max?: NestedEnumAiProviderStatusFilter<$PrismaModel>
  }

  export type NestedEnumAiAgentStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.AiAgentStatus | EnumAiAgentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AiAgentStatus[] | ListEnumAiAgentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiAgentStatus[] | ListEnumAiAgentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAiAgentStatusFilter<$PrismaModel> | $Enums.AiAgentStatus
  }

  export type NestedEnumAiAgentStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AiAgentStatus | EnumAiAgentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AiAgentStatus[] | ListEnumAiAgentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiAgentStatus[] | ListEnumAiAgentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAiAgentStatusWithAggregatesFilter<$PrismaModel> | $Enums.AiAgentStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAiAgentStatusFilter<$PrismaModel>
    _max?: NestedEnumAiAgentStatusFilter<$PrismaModel>
  }

  export type NestedEnumAiToolStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.AiToolStatus | EnumAiToolStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AiToolStatus[] | ListEnumAiToolStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiToolStatus[] | ListEnumAiToolStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAiToolStatusFilter<$PrismaModel> | $Enums.AiToolStatus
  }

  export type NestedEnumAiToolSourceFilter<$PrismaModel = never> = {
    equals?: $Enums.AiToolSource | EnumAiToolSourceFieldRefInput<$PrismaModel>
    in?: $Enums.AiToolSource[] | ListEnumAiToolSourceFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiToolSource[] | ListEnumAiToolSourceFieldRefInput<$PrismaModel>
    not?: NestedEnumAiToolSourceFilter<$PrismaModel> | $Enums.AiToolSource
  }

  export type NestedEnumAiToolStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AiToolStatus | EnumAiToolStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AiToolStatus[] | ListEnumAiToolStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiToolStatus[] | ListEnumAiToolStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAiToolStatusWithAggregatesFilter<$PrismaModel> | $Enums.AiToolStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAiToolStatusFilter<$PrismaModel>
    _max?: NestedEnumAiToolStatusFilter<$PrismaModel>
  }

  export type NestedEnumAiToolSourceWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AiToolSource | EnumAiToolSourceFieldRefInput<$PrismaModel>
    in?: $Enums.AiToolSource[] | ListEnumAiToolSourceFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiToolSource[] | ListEnumAiToolSourceFieldRefInput<$PrismaModel>
    not?: NestedEnumAiToolSourceWithAggregatesFilter<$PrismaModel> | $Enums.AiToolSource
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAiToolSourceFilter<$PrismaModel>
    _max?: NestedEnumAiToolSourceFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedEnumScanRunStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ScanRunStatus | EnumScanRunStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ScanRunStatus[] | ListEnumScanRunStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ScanRunStatus[] | ListEnumScanRunStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumScanRunStatusFilter<$PrismaModel> | $Enums.ScanRunStatus
  }

  export type NestedEnumScanRunStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ScanRunStatus | EnumScanRunStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ScanRunStatus[] | ListEnumScanRunStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ScanRunStatus[] | ListEnumScanRunStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumScanRunStatusWithAggregatesFilter<$PrismaModel> | $Enums.ScanRunStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumScanRunStatusFilter<$PrismaModel>
    _max?: NestedEnumScanRunStatusFilter<$PrismaModel>
  }

  export type NestedEnumScanTacticStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ScanTacticStatus | EnumScanTacticStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ScanTacticStatus[] | ListEnumScanTacticStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ScanTacticStatus[] | ListEnumScanTacticStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumScanTacticStatusFilter<$PrismaModel> | $Enums.ScanTacticStatus
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedEnumScanTacticStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ScanTacticStatus | EnumScanTacticStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ScanTacticStatus[] | ListEnumScanTacticStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ScanTacticStatus[] | ListEnumScanTacticStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumScanTacticStatusWithAggregatesFilter<$PrismaModel> | $Enums.ScanTacticStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumScanTacticStatusFilter<$PrismaModel>
    _max?: NestedEnumScanTacticStatusFilter<$PrismaModel>
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type RuntimeCreateWithoutApplicationInput = {
    id: string
    name: string
    serviceType: $Enums.RuntimeServiceType
    provider: $Enums.RuntimeProvider
    environment: $Enums.ApplicationEnvironment
    region: string
    status: $Enums.RuntimeStatus
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RuntimeUncheckedCreateWithoutApplicationInput = {
    id: string
    name: string
    serviceType: $Enums.RuntimeServiceType
    provider: $Enums.RuntimeProvider
    environment: $Enums.ApplicationEnvironment
    region: string
    status: $Enums.RuntimeStatus
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RuntimeCreateOrConnectWithoutApplicationInput = {
    where: RuntimeWhereUniqueInput
    create: XOR<RuntimeCreateWithoutApplicationInput, RuntimeUncheckedCreateWithoutApplicationInput>
  }

  export type RuntimeCreateManyApplicationInputEnvelope = {
    data: RuntimeCreateManyApplicationInput | RuntimeCreateManyApplicationInput[]
    skipDuplicates?: boolean
  }

  export type RuntimeUpsertWithWhereUniqueWithoutApplicationInput = {
    where: RuntimeWhereUniqueInput
    update: XOR<RuntimeUpdateWithoutApplicationInput, RuntimeUncheckedUpdateWithoutApplicationInput>
    create: XOR<RuntimeCreateWithoutApplicationInput, RuntimeUncheckedCreateWithoutApplicationInput>
  }

  export type RuntimeUpdateWithWhereUniqueWithoutApplicationInput = {
    where: RuntimeWhereUniqueInput
    data: XOR<RuntimeUpdateWithoutApplicationInput, RuntimeUncheckedUpdateWithoutApplicationInput>
  }

  export type RuntimeUpdateManyWithWhereWithoutApplicationInput = {
    where: RuntimeScalarWhereInput
    data: XOR<RuntimeUpdateManyMutationInput, RuntimeUncheckedUpdateManyWithoutApplicationInput>
  }

  export type RuntimeScalarWhereInput = {
    AND?: RuntimeScalarWhereInput | RuntimeScalarWhereInput[]
    OR?: RuntimeScalarWhereInput[]
    NOT?: RuntimeScalarWhereInput | RuntimeScalarWhereInput[]
    id?: UuidFilter<"Runtime"> | string
    name?: StringFilter<"Runtime"> | string
    serviceType?: EnumRuntimeServiceTypeFilter<"Runtime"> | $Enums.RuntimeServiceType
    provider?: EnumRuntimeProviderFilter<"Runtime"> | $Enums.RuntimeProvider
    environment?: EnumApplicationEnvironmentFilter<"Runtime"> | $Enums.ApplicationEnvironment
    region?: StringFilter<"Runtime"> | string
    status?: EnumRuntimeStatusFilter<"Runtime"> | $Enums.RuntimeStatus
    applicationId?: UuidNullableFilter<"Runtime"> | string | null
    createdAt?: DateTimeFilter<"Runtime"> | Date | string
    updatedAt?: DateTimeFilter<"Runtime"> | Date | string
  }

  export type ApplicationCreateWithoutRuntimesInput = {
    id: string
    name: string
    baseUrl?: string | null
    environment: $Enums.ApplicationEnvironment
    status: $Enums.ApplicationStatus
    lastScannedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ApplicationUncheckedCreateWithoutRuntimesInput = {
    id: string
    name: string
    baseUrl?: string | null
    environment: $Enums.ApplicationEnvironment
    status: $Enums.ApplicationStatus
    lastScannedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ApplicationCreateOrConnectWithoutRuntimesInput = {
    where: ApplicationWhereUniqueInput
    create: XOR<ApplicationCreateWithoutRuntimesInput, ApplicationUncheckedCreateWithoutRuntimesInput>
  }

  export type ApplicationUpsertWithoutRuntimesInput = {
    update: XOR<ApplicationUpdateWithoutRuntimesInput, ApplicationUncheckedUpdateWithoutRuntimesInput>
    create: XOR<ApplicationCreateWithoutRuntimesInput, ApplicationUncheckedCreateWithoutRuntimesInput>
    where?: ApplicationWhereInput
  }

  export type ApplicationUpdateToOneWithWhereWithoutRuntimesInput = {
    where?: ApplicationWhereInput
    data: XOR<ApplicationUpdateWithoutRuntimesInput, ApplicationUncheckedUpdateWithoutRuntimesInput>
  }

  export type ApplicationUpdateWithoutRuntimesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    environment?: EnumApplicationEnvironmentFieldUpdateOperationsInput | $Enums.ApplicationEnvironment
    status?: EnumApplicationStatusFieldUpdateOperationsInput | $Enums.ApplicationStatus
    lastScannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApplicationUncheckedUpdateWithoutRuntimesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    environment?: EnumApplicationEnvironmentFieldUpdateOperationsInput | $Enums.ApplicationEnvironment
    status?: EnumApplicationStatusFieldUpdateOperationsInput | $Enums.ApplicationStatus
    lastScannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiAgentCreateWithoutProviderInput = {
    id: string
    name: string
    status: $Enums.AiAgentStatus
    description?: string | null
    systemPrompt: string
    modelOverride?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tools?: AiAgentToolCreateNestedManyWithoutAgentInput
  }

  export type AiAgentUncheckedCreateWithoutProviderInput = {
    id: string
    name: string
    status: $Enums.AiAgentStatus
    description?: string | null
    systemPrompt: string
    modelOverride?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tools?: AiAgentToolUncheckedCreateNestedManyWithoutAgentInput
  }

  export type AiAgentCreateOrConnectWithoutProviderInput = {
    where: AiAgentWhereUniqueInput
    create: XOR<AiAgentCreateWithoutProviderInput, AiAgentUncheckedCreateWithoutProviderInput>
  }

  export type AiAgentCreateManyProviderInputEnvelope = {
    data: AiAgentCreateManyProviderInput | AiAgentCreateManyProviderInput[]
    skipDuplicates?: boolean
  }

  export type AiAgentUpsertWithWhereUniqueWithoutProviderInput = {
    where: AiAgentWhereUniqueInput
    update: XOR<AiAgentUpdateWithoutProviderInput, AiAgentUncheckedUpdateWithoutProviderInput>
    create: XOR<AiAgentCreateWithoutProviderInput, AiAgentUncheckedCreateWithoutProviderInput>
  }

  export type AiAgentUpdateWithWhereUniqueWithoutProviderInput = {
    where: AiAgentWhereUniqueInput
    data: XOR<AiAgentUpdateWithoutProviderInput, AiAgentUncheckedUpdateWithoutProviderInput>
  }

  export type AiAgentUpdateManyWithWhereWithoutProviderInput = {
    where: AiAgentScalarWhereInput
    data: XOR<AiAgentUpdateManyMutationInput, AiAgentUncheckedUpdateManyWithoutProviderInput>
  }

  export type AiAgentScalarWhereInput = {
    AND?: AiAgentScalarWhereInput | AiAgentScalarWhereInput[]
    OR?: AiAgentScalarWhereInput[]
    NOT?: AiAgentScalarWhereInput | AiAgentScalarWhereInput[]
    id?: UuidFilter<"AiAgent"> | string
    name?: StringFilter<"AiAgent"> | string
    status?: EnumAiAgentStatusFilter<"AiAgent"> | $Enums.AiAgentStatus
    description?: StringNullableFilter<"AiAgent"> | string | null
    providerId?: UuidFilter<"AiAgent"> | string
    systemPrompt?: StringFilter<"AiAgent"> | string
    modelOverride?: StringNullableFilter<"AiAgent"> | string | null
    createdAt?: DateTimeFilter<"AiAgent"> | Date | string
    updatedAt?: DateTimeFilter<"AiAgent"> | Date | string
  }

  export type AiProviderCreateWithoutAgentsInput = {
    id: string
    name: string
    kind: $Enums.AiProviderKind
    status: $Enums.AiProviderStatus
    description?: string | null
    baseUrl?: string | null
    model: string
    apiKey?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AiProviderUncheckedCreateWithoutAgentsInput = {
    id: string
    name: string
    kind: $Enums.AiProviderKind
    status: $Enums.AiProviderStatus
    description?: string | null
    baseUrl?: string | null
    model: string
    apiKey?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AiProviderCreateOrConnectWithoutAgentsInput = {
    where: AiProviderWhereUniqueInput
    create: XOR<AiProviderCreateWithoutAgentsInput, AiProviderUncheckedCreateWithoutAgentsInput>
  }

  export type AiAgentToolCreateWithoutAgentInput = {
    ord: number
    tool: AiToolCreateNestedOneWithoutAgentsInput
  }

  export type AiAgentToolUncheckedCreateWithoutAgentInput = {
    toolId: string
    ord: number
  }

  export type AiAgentToolCreateOrConnectWithoutAgentInput = {
    where: AiAgentToolWhereUniqueInput
    create: XOR<AiAgentToolCreateWithoutAgentInput, AiAgentToolUncheckedCreateWithoutAgentInput>
  }

  export type AiAgentToolCreateManyAgentInputEnvelope = {
    data: AiAgentToolCreateManyAgentInput | AiAgentToolCreateManyAgentInput[]
    skipDuplicates?: boolean
  }

  export type AiProviderUpsertWithoutAgentsInput = {
    update: XOR<AiProviderUpdateWithoutAgentsInput, AiProviderUncheckedUpdateWithoutAgentsInput>
    create: XOR<AiProviderCreateWithoutAgentsInput, AiProviderUncheckedCreateWithoutAgentsInput>
    where?: AiProviderWhereInput
  }

  export type AiProviderUpdateToOneWithWhereWithoutAgentsInput = {
    where?: AiProviderWhereInput
    data: XOR<AiProviderUpdateWithoutAgentsInput, AiProviderUncheckedUpdateWithoutAgentsInput>
  }

  export type AiProviderUpdateWithoutAgentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    kind?: EnumAiProviderKindFieldUpdateOperationsInput | $Enums.AiProviderKind
    status?: EnumAiProviderStatusFieldUpdateOperationsInput | $Enums.AiProviderStatus
    description?: NullableStringFieldUpdateOperationsInput | string | null
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model?: StringFieldUpdateOperationsInput | string
    apiKey?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiProviderUncheckedUpdateWithoutAgentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    kind?: EnumAiProviderKindFieldUpdateOperationsInput | $Enums.AiProviderKind
    status?: EnumAiProviderStatusFieldUpdateOperationsInput | $Enums.AiProviderStatus
    description?: NullableStringFieldUpdateOperationsInput | string | null
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model?: StringFieldUpdateOperationsInput | string
    apiKey?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiAgentToolUpsertWithWhereUniqueWithoutAgentInput = {
    where: AiAgentToolWhereUniqueInput
    update: XOR<AiAgentToolUpdateWithoutAgentInput, AiAgentToolUncheckedUpdateWithoutAgentInput>
    create: XOR<AiAgentToolCreateWithoutAgentInput, AiAgentToolUncheckedCreateWithoutAgentInput>
  }

  export type AiAgentToolUpdateWithWhereUniqueWithoutAgentInput = {
    where: AiAgentToolWhereUniqueInput
    data: XOR<AiAgentToolUpdateWithoutAgentInput, AiAgentToolUncheckedUpdateWithoutAgentInput>
  }

  export type AiAgentToolUpdateManyWithWhereWithoutAgentInput = {
    where: AiAgentToolScalarWhereInput
    data: XOR<AiAgentToolUpdateManyMutationInput, AiAgentToolUncheckedUpdateManyWithoutAgentInput>
  }

  export type AiAgentToolScalarWhereInput = {
    AND?: AiAgentToolScalarWhereInput | AiAgentToolScalarWhereInput[]
    OR?: AiAgentToolScalarWhereInput[]
    NOT?: AiAgentToolScalarWhereInput | AiAgentToolScalarWhereInput[]
    agentId?: UuidFilter<"AiAgentTool"> | string
    toolId?: StringFilter<"AiAgentTool"> | string
    ord?: IntFilter<"AiAgentTool"> | number
  }

  export type AiAgentToolCreateWithoutToolInput = {
    ord: number
    agent: AiAgentCreateNestedOneWithoutToolsInput
  }

  export type AiAgentToolUncheckedCreateWithoutToolInput = {
    agentId: string
    ord: number
  }

  export type AiAgentToolCreateOrConnectWithoutToolInput = {
    where: AiAgentToolWhereUniqueInput
    create: XOR<AiAgentToolCreateWithoutToolInput, AiAgentToolUncheckedCreateWithoutToolInput>
  }

  export type AiAgentToolCreateManyToolInputEnvelope = {
    data: AiAgentToolCreateManyToolInput | AiAgentToolCreateManyToolInput[]
    skipDuplicates?: boolean
  }

  export type AiAgentToolUpsertWithWhereUniqueWithoutToolInput = {
    where: AiAgentToolWhereUniqueInput
    update: XOR<AiAgentToolUpdateWithoutToolInput, AiAgentToolUncheckedUpdateWithoutToolInput>
    create: XOR<AiAgentToolCreateWithoutToolInput, AiAgentToolUncheckedCreateWithoutToolInput>
  }

  export type AiAgentToolUpdateWithWhereUniqueWithoutToolInput = {
    where: AiAgentToolWhereUniqueInput
    data: XOR<AiAgentToolUpdateWithoutToolInput, AiAgentToolUncheckedUpdateWithoutToolInput>
  }

  export type AiAgentToolUpdateManyWithWhereWithoutToolInput = {
    where: AiAgentToolScalarWhereInput
    data: XOR<AiAgentToolUpdateManyMutationInput, AiAgentToolUncheckedUpdateManyWithoutToolInput>
  }

  export type AiAgentCreateWithoutToolsInput = {
    id: string
    name: string
    status: $Enums.AiAgentStatus
    description?: string | null
    systemPrompt: string
    modelOverride?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    provider: AiProviderCreateNestedOneWithoutAgentsInput
  }

  export type AiAgentUncheckedCreateWithoutToolsInput = {
    id: string
    name: string
    status: $Enums.AiAgentStatus
    description?: string | null
    providerId: string
    systemPrompt: string
    modelOverride?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AiAgentCreateOrConnectWithoutToolsInput = {
    where: AiAgentWhereUniqueInput
    create: XOR<AiAgentCreateWithoutToolsInput, AiAgentUncheckedCreateWithoutToolsInput>
  }

  export type AiToolCreateWithoutAgentsInput = {
    id: string
    name: string
    status: $Enums.AiToolStatus
    source: $Enums.AiToolSource
    description?: string | null
    adapter?: string | null
    binary?: string | null
    category: string
    riskTier: string
    notes?: string | null
    inputSchema: JsonNullValueInput | InputJsonValue
    outputSchema: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AiToolUncheckedCreateWithoutAgentsInput = {
    id: string
    name: string
    status: $Enums.AiToolStatus
    source: $Enums.AiToolSource
    description?: string | null
    adapter?: string | null
    binary?: string | null
    category: string
    riskTier: string
    notes?: string | null
    inputSchema: JsonNullValueInput | InputJsonValue
    outputSchema: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AiToolCreateOrConnectWithoutAgentsInput = {
    where: AiToolWhereUniqueInput
    create: XOR<AiToolCreateWithoutAgentsInput, AiToolUncheckedCreateWithoutAgentsInput>
  }

  export type AiAgentUpsertWithoutToolsInput = {
    update: XOR<AiAgentUpdateWithoutToolsInput, AiAgentUncheckedUpdateWithoutToolsInput>
    create: XOR<AiAgentCreateWithoutToolsInput, AiAgentUncheckedCreateWithoutToolsInput>
    where?: AiAgentWhereInput
  }

  export type AiAgentUpdateToOneWithWhereWithoutToolsInput = {
    where?: AiAgentWhereInput
    data: XOR<AiAgentUpdateWithoutToolsInput, AiAgentUncheckedUpdateWithoutToolsInput>
  }

  export type AiAgentUpdateWithoutToolsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    status?: EnumAiAgentStatusFieldUpdateOperationsInput | $Enums.AiAgentStatus
    description?: NullableStringFieldUpdateOperationsInput | string | null
    systemPrompt?: StringFieldUpdateOperationsInput | string
    modelOverride?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    provider?: AiProviderUpdateOneRequiredWithoutAgentsNestedInput
  }

  export type AiAgentUncheckedUpdateWithoutToolsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    status?: EnumAiAgentStatusFieldUpdateOperationsInput | $Enums.AiAgentStatus
    description?: NullableStringFieldUpdateOperationsInput | string | null
    providerId?: StringFieldUpdateOperationsInput | string
    systemPrompt?: StringFieldUpdateOperationsInput | string
    modelOverride?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiToolUpsertWithoutAgentsInput = {
    update: XOR<AiToolUpdateWithoutAgentsInput, AiToolUncheckedUpdateWithoutAgentsInput>
    create: XOR<AiToolCreateWithoutAgentsInput, AiToolUncheckedCreateWithoutAgentsInput>
    where?: AiToolWhereInput
  }

  export type AiToolUpdateToOneWithWhereWithoutAgentsInput = {
    where?: AiToolWhereInput
    data: XOR<AiToolUpdateWithoutAgentsInput, AiToolUncheckedUpdateWithoutAgentsInput>
  }

  export type AiToolUpdateWithoutAgentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    status?: EnumAiToolStatusFieldUpdateOperationsInput | $Enums.AiToolStatus
    source?: EnumAiToolSourceFieldUpdateOperationsInput | $Enums.AiToolSource
    description?: NullableStringFieldUpdateOperationsInput | string | null
    adapter?: NullableStringFieldUpdateOperationsInput | string | null
    binary?: NullableStringFieldUpdateOperationsInput | string | null
    category?: StringFieldUpdateOperationsInput | string
    riskTier?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    inputSchema?: JsonNullValueInput | InputJsonValue
    outputSchema?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiToolUncheckedUpdateWithoutAgentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    status?: EnumAiToolStatusFieldUpdateOperationsInput | $Enums.AiToolStatus
    source?: EnumAiToolSourceFieldUpdateOperationsInput | $Enums.AiToolSource
    description?: NullableStringFieldUpdateOperationsInput | string | null
    adapter?: NullableStringFieldUpdateOperationsInput | string | null
    binary?: NullableStringFieldUpdateOperationsInput | string | null
    category?: StringFieldUpdateOperationsInput | string
    riskTier?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    inputSchema?: JsonNullValueInput | InputJsonValue
    outputSchema?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScanTacticCreateWithoutScanRunInput = {
    id: string
    target: string
    layer: string
    service?: string | null
    port?: number | null
    riskScore: number
    status: $Enums.ScanTacticStatus
    depth: number
    createdAt?: Date | string
    parentTactic?: ScanTacticCreateNestedOneWithoutChildTacticsInput
    childTactics?: ScanTacticCreateNestedManyWithoutParentTacticInput
    scanFindings?: ScanFindingCreateNestedManyWithoutScanTacticInput
  }

  export type ScanTacticUncheckedCreateWithoutScanRunInput = {
    id: string
    target: string
    layer: string
    service?: string | null
    port?: number | null
    riskScore: number
    status: $Enums.ScanTacticStatus
    parentTacticId?: string | null
    depth: number
    createdAt?: Date | string
    childTactics?: ScanTacticUncheckedCreateNestedManyWithoutParentTacticInput
    scanFindings?: ScanFindingUncheckedCreateNestedManyWithoutScanTacticInput
  }

  export type ScanTacticCreateOrConnectWithoutScanRunInput = {
    where: ScanTacticWhereUniqueInput
    create: XOR<ScanTacticCreateWithoutScanRunInput, ScanTacticUncheckedCreateWithoutScanRunInput>
  }

  export type ScanTacticCreateManyScanRunInputEnvelope = {
    data: ScanTacticCreateManyScanRunInput | ScanTacticCreateManyScanRunInput[]
    skipDuplicates?: boolean
  }

  export type ScanFindingCreateWithoutScanRunInput = {
    id: string
    agentId: string
    severity: string
    confidence: number
    title: string
    description: string
    evidence: string
    technique: string
    reproduceCommand?: string | null
    validated?: boolean
    validationStatus?: string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: string | null
    createdAt?: Date | string
    scanTactic: ScanTacticCreateNestedOneWithoutScanFindingsInput
    routeFindings?: EscalationRouteFindingCreateNestedManyWithoutScanFindingInput
  }

  export type ScanFindingUncheckedCreateWithoutScanRunInput = {
    id: string
    scanTacticId: string
    agentId: string
    severity: string
    confidence: number
    title: string
    description: string
    evidence: string
    technique: string
    reproduceCommand?: string | null
    validated?: boolean
    validationStatus?: string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: string | null
    createdAt?: Date | string
    routeFindings?: EscalationRouteFindingUncheckedCreateNestedManyWithoutScanFindingInput
  }

  export type ScanFindingCreateOrConnectWithoutScanRunInput = {
    where: ScanFindingWhereUniqueInput
    create: XOR<ScanFindingCreateWithoutScanRunInput, ScanFindingUncheckedCreateWithoutScanRunInput>
  }

  export type ScanFindingCreateManyScanRunInputEnvelope = {
    data: ScanFindingCreateManyScanRunInput | ScanFindingCreateManyScanRunInput[]
    skipDuplicates?: boolean
  }

  export type ScanAuditEntryCreateWithoutScanRunInput = {
    id: string
    timestamp: Date | string
    actor: string
    action: string
    targetTacticId?: string | null
    scopeValid: boolean
    details: JsonNullValueInput | InputJsonValue
  }

  export type ScanAuditEntryUncheckedCreateWithoutScanRunInput = {
    id: string
    timestamp: Date | string
    actor: string
    action: string
    targetTacticId?: string | null
    scopeValid: boolean
    details: JsonNullValueInput | InputJsonValue
  }

  export type ScanAuditEntryCreateOrConnectWithoutScanRunInput = {
    where: ScanAuditEntryWhereUniqueInput
    create: XOR<ScanAuditEntryCreateWithoutScanRunInput, ScanAuditEntryUncheckedCreateWithoutScanRunInput>
  }

  export type ScanAuditEntryCreateManyScanRunInputEnvelope = {
    data: ScanAuditEntryCreateManyScanRunInput | ScanAuditEntryCreateManyScanRunInput[]
    skipDuplicates?: boolean
  }

  export type EscalationRouteCreateWithoutScanRunInput = {
    id: string
    title: string
    compositeRisk: number
    technique: string
    startTarget: string
    endTarget: string
    routeLength: number
    confidence: number
    narrative?: string | null
    createdAt?: Date | string
    routeFindings?: EscalationRouteFindingCreateNestedManyWithoutEscalationRouteInput
  }

  export type EscalationRouteUncheckedCreateWithoutScanRunInput = {
    id: string
    title: string
    compositeRisk: number
    technique: string
    startTarget: string
    endTarget: string
    routeLength: number
    confidence: number
    narrative?: string | null
    createdAt?: Date | string
    routeFindings?: EscalationRouteFindingUncheckedCreateNestedManyWithoutEscalationRouteInput
  }

  export type EscalationRouteCreateOrConnectWithoutScanRunInput = {
    where: EscalationRouteWhereUniqueInput
    create: XOR<EscalationRouteCreateWithoutScanRunInput, EscalationRouteUncheckedCreateWithoutScanRunInput>
  }

  export type EscalationRouteCreateManyScanRunInputEnvelope = {
    data: EscalationRouteCreateManyScanRunInput | EscalationRouteCreateManyScanRunInput[]
    skipDuplicates?: boolean
  }

  export type ScanTacticUpsertWithWhereUniqueWithoutScanRunInput = {
    where: ScanTacticWhereUniqueInput
    update: XOR<ScanTacticUpdateWithoutScanRunInput, ScanTacticUncheckedUpdateWithoutScanRunInput>
    create: XOR<ScanTacticCreateWithoutScanRunInput, ScanTacticUncheckedCreateWithoutScanRunInput>
  }

  export type ScanTacticUpdateWithWhereUniqueWithoutScanRunInput = {
    where: ScanTacticWhereUniqueInput
    data: XOR<ScanTacticUpdateWithoutScanRunInput, ScanTacticUncheckedUpdateWithoutScanRunInput>
  }

  export type ScanTacticUpdateManyWithWhereWithoutScanRunInput = {
    where: ScanTacticScalarWhereInput
    data: XOR<ScanTacticUpdateManyMutationInput, ScanTacticUncheckedUpdateManyWithoutScanRunInput>
  }

  export type ScanTacticScalarWhereInput = {
    AND?: ScanTacticScalarWhereInput | ScanTacticScalarWhereInput[]
    OR?: ScanTacticScalarWhereInput[]
    NOT?: ScanTacticScalarWhereInput | ScanTacticScalarWhereInput[]
    id?: UuidFilter<"ScanTactic"> | string
    scanRunId?: UuidFilter<"ScanTactic"> | string
    target?: StringFilter<"ScanTactic"> | string
    layer?: StringFilter<"ScanTactic"> | string
    service?: StringNullableFilter<"ScanTactic"> | string | null
    port?: IntNullableFilter<"ScanTactic"> | number | null
    riskScore?: FloatFilter<"ScanTactic"> | number
    status?: EnumScanTacticStatusFilter<"ScanTactic"> | $Enums.ScanTacticStatus
    parentTacticId?: UuidNullableFilter<"ScanTactic"> | string | null
    depth?: IntFilter<"ScanTactic"> | number
    createdAt?: DateTimeFilter<"ScanTactic"> | Date | string
  }

  export type ScanFindingUpsertWithWhereUniqueWithoutScanRunInput = {
    where: ScanFindingWhereUniqueInput
    update: XOR<ScanFindingUpdateWithoutScanRunInput, ScanFindingUncheckedUpdateWithoutScanRunInput>
    create: XOR<ScanFindingCreateWithoutScanRunInput, ScanFindingUncheckedCreateWithoutScanRunInput>
  }

  export type ScanFindingUpdateWithWhereUniqueWithoutScanRunInput = {
    where: ScanFindingWhereUniqueInput
    data: XOR<ScanFindingUpdateWithoutScanRunInput, ScanFindingUncheckedUpdateWithoutScanRunInput>
  }

  export type ScanFindingUpdateManyWithWhereWithoutScanRunInput = {
    where: ScanFindingScalarWhereInput
    data: XOR<ScanFindingUpdateManyMutationInput, ScanFindingUncheckedUpdateManyWithoutScanRunInput>
  }

  export type ScanFindingScalarWhereInput = {
    AND?: ScanFindingScalarWhereInput | ScanFindingScalarWhereInput[]
    OR?: ScanFindingScalarWhereInput[]
    NOT?: ScanFindingScalarWhereInput | ScanFindingScalarWhereInput[]
    id?: UuidFilter<"ScanFinding"> | string
    scanRunId?: UuidFilter<"ScanFinding"> | string
    scanTacticId?: UuidFilter<"ScanFinding"> | string
    agentId?: StringFilter<"ScanFinding"> | string
    severity?: StringFilter<"ScanFinding"> | string
    confidence?: FloatFilter<"ScanFinding"> | number
    title?: StringFilter<"ScanFinding"> | string
    description?: StringFilter<"ScanFinding"> | string
    evidence?: StringFilter<"ScanFinding"> | string
    technique?: StringFilter<"ScanFinding"> | string
    reproduceCommand?: StringNullableFilter<"ScanFinding"> | string | null
    validated?: BoolFilter<"ScanFinding"> | boolean
    validationStatus?: StringNullableFilter<"ScanFinding"> | string | null
    evidenceRefs?: JsonNullableFilter<"ScanFinding">
    sourceToolRuns?: JsonNullableFilter<"ScanFinding">
    confidenceReason?: StringNullableFilter<"ScanFinding"> | string | null
    createdAt?: DateTimeFilter<"ScanFinding"> | Date | string
  }

  export type ScanAuditEntryUpsertWithWhereUniqueWithoutScanRunInput = {
    where: ScanAuditEntryWhereUniqueInput
    update: XOR<ScanAuditEntryUpdateWithoutScanRunInput, ScanAuditEntryUncheckedUpdateWithoutScanRunInput>
    create: XOR<ScanAuditEntryCreateWithoutScanRunInput, ScanAuditEntryUncheckedCreateWithoutScanRunInput>
  }

  export type ScanAuditEntryUpdateWithWhereUniqueWithoutScanRunInput = {
    where: ScanAuditEntryWhereUniqueInput
    data: XOR<ScanAuditEntryUpdateWithoutScanRunInput, ScanAuditEntryUncheckedUpdateWithoutScanRunInput>
  }

  export type ScanAuditEntryUpdateManyWithWhereWithoutScanRunInput = {
    where: ScanAuditEntryScalarWhereInput
    data: XOR<ScanAuditEntryUpdateManyMutationInput, ScanAuditEntryUncheckedUpdateManyWithoutScanRunInput>
  }

  export type ScanAuditEntryScalarWhereInput = {
    AND?: ScanAuditEntryScalarWhereInput | ScanAuditEntryScalarWhereInput[]
    OR?: ScanAuditEntryScalarWhereInput[]
    NOT?: ScanAuditEntryScalarWhereInput | ScanAuditEntryScalarWhereInput[]
    id?: UuidFilter<"ScanAuditEntry"> | string
    scanRunId?: UuidFilter<"ScanAuditEntry"> | string
    timestamp?: DateTimeFilter<"ScanAuditEntry"> | Date | string
    actor?: StringFilter<"ScanAuditEntry"> | string
    action?: StringFilter<"ScanAuditEntry"> | string
    targetTacticId?: UuidNullableFilter<"ScanAuditEntry"> | string | null
    scopeValid?: BoolFilter<"ScanAuditEntry"> | boolean
    details?: JsonFilter<"ScanAuditEntry">
  }

  export type EscalationRouteUpsertWithWhereUniqueWithoutScanRunInput = {
    where: EscalationRouteWhereUniqueInput
    update: XOR<EscalationRouteUpdateWithoutScanRunInput, EscalationRouteUncheckedUpdateWithoutScanRunInput>
    create: XOR<EscalationRouteCreateWithoutScanRunInput, EscalationRouteUncheckedCreateWithoutScanRunInput>
  }

  export type EscalationRouteUpdateWithWhereUniqueWithoutScanRunInput = {
    where: EscalationRouteWhereUniqueInput
    data: XOR<EscalationRouteUpdateWithoutScanRunInput, EscalationRouteUncheckedUpdateWithoutScanRunInput>
  }

  export type EscalationRouteUpdateManyWithWhereWithoutScanRunInput = {
    where: EscalationRouteScalarWhereInput
    data: XOR<EscalationRouteUpdateManyMutationInput, EscalationRouteUncheckedUpdateManyWithoutScanRunInput>
  }

  export type EscalationRouteScalarWhereInput = {
    AND?: EscalationRouteScalarWhereInput | EscalationRouteScalarWhereInput[]
    OR?: EscalationRouteScalarWhereInput[]
    NOT?: EscalationRouteScalarWhereInput | EscalationRouteScalarWhereInput[]
    id?: UuidFilter<"EscalationRoute"> | string
    scanRunId?: UuidFilter<"EscalationRoute"> | string
    title?: StringFilter<"EscalationRoute"> | string
    compositeRisk?: FloatFilter<"EscalationRoute"> | number
    technique?: StringFilter<"EscalationRoute"> | string
    startTarget?: StringFilter<"EscalationRoute"> | string
    endTarget?: StringFilter<"EscalationRoute"> | string
    routeLength?: IntFilter<"EscalationRoute"> | number
    confidence?: FloatFilter<"EscalationRoute"> | number
    narrative?: StringNullableFilter<"EscalationRoute"> | string | null
    createdAt?: DateTimeFilter<"EscalationRoute"> | Date | string
  }

  export type ScanRunCreateWithoutScanTacticsInput = {
    id: string
    scope: JsonNullValueInput | InputJsonValue
    status: $Enums.ScanRunStatus
    currentRound?: number
    tacticsTotal?: number
    tacticsComplete?: number
    createdAt?: Date | string
    completedAt?: Date | string | null
    scanFindings?: ScanFindingCreateNestedManyWithoutScanRunInput
    scanAuditEntries?: ScanAuditEntryCreateNestedManyWithoutScanRunInput
    escalationRoutes?: EscalationRouteCreateNestedManyWithoutScanRunInput
  }

  export type ScanRunUncheckedCreateWithoutScanTacticsInput = {
    id: string
    scope: JsonNullValueInput | InputJsonValue
    status: $Enums.ScanRunStatus
    currentRound?: number
    tacticsTotal?: number
    tacticsComplete?: number
    createdAt?: Date | string
    completedAt?: Date | string | null
    scanFindings?: ScanFindingUncheckedCreateNestedManyWithoutScanRunInput
    scanAuditEntries?: ScanAuditEntryUncheckedCreateNestedManyWithoutScanRunInput
    escalationRoutes?: EscalationRouteUncheckedCreateNestedManyWithoutScanRunInput
  }

  export type ScanRunCreateOrConnectWithoutScanTacticsInput = {
    where: ScanRunWhereUniqueInput
    create: XOR<ScanRunCreateWithoutScanTacticsInput, ScanRunUncheckedCreateWithoutScanTacticsInput>
  }

  export type ScanTacticCreateWithoutChildTacticsInput = {
    id: string
    target: string
    layer: string
    service?: string | null
    port?: number | null
    riskScore: number
    status: $Enums.ScanTacticStatus
    depth: number
    createdAt?: Date | string
    scanRun: ScanRunCreateNestedOneWithoutScanTacticsInput
    parentTactic?: ScanTacticCreateNestedOneWithoutChildTacticsInput
    scanFindings?: ScanFindingCreateNestedManyWithoutScanTacticInput
  }

  export type ScanTacticUncheckedCreateWithoutChildTacticsInput = {
    id: string
    scanRunId: string
    target: string
    layer: string
    service?: string | null
    port?: number | null
    riskScore: number
    status: $Enums.ScanTacticStatus
    parentTacticId?: string | null
    depth: number
    createdAt?: Date | string
    scanFindings?: ScanFindingUncheckedCreateNestedManyWithoutScanTacticInput
  }

  export type ScanTacticCreateOrConnectWithoutChildTacticsInput = {
    where: ScanTacticWhereUniqueInput
    create: XOR<ScanTacticCreateWithoutChildTacticsInput, ScanTacticUncheckedCreateWithoutChildTacticsInput>
  }

  export type ScanTacticCreateWithoutParentTacticInput = {
    id: string
    target: string
    layer: string
    service?: string | null
    port?: number | null
    riskScore: number
    status: $Enums.ScanTacticStatus
    depth: number
    createdAt?: Date | string
    scanRun: ScanRunCreateNestedOneWithoutScanTacticsInput
    childTactics?: ScanTacticCreateNestedManyWithoutParentTacticInput
    scanFindings?: ScanFindingCreateNestedManyWithoutScanTacticInput
  }

  export type ScanTacticUncheckedCreateWithoutParentTacticInput = {
    id: string
    scanRunId: string
    target: string
    layer: string
    service?: string | null
    port?: number | null
    riskScore: number
    status: $Enums.ScanTacticStatus
    depth: number
    createdAt?: Date | string
    childTactics?: ScanTacticUncheckedCreateNestedManyWithoutParentTacticInput
    scanFindings?: ScanFindingUncheckedCreateNestedManyWithoutScanTacticInput
  }

  export type ScanTacticCreateOrConnectWithoutParentTacticInput = {
    where: ScanTacticWhereUniqueInput
    create: XOR<ScanTacticCreateWithoutParentTacticInput, ScanTacticUncheckedCreateWithoutParentTacticInput>
  }

  export type ScanTacticCreateManyParentTacticInputEnvelope = {
    data: ScanTacticCreateManyParentTacticInput | ScanTacticCreateManyParentTacticInput[]
    skipDuplicates?: boolean
  }

  export type ScanFindingCreateWithoutScanTacticInput = {
    id: string
    agentId: string
    severity: string
    confidence: number
    title: string
    description: string
    evidence: string
    technique: string
    reproduceCommand?: string | null
    validated?: boolean
    validationStatus?: string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: string | null
    createdAt?: Date | string
    scanRun: ScanRunCreateNestedOneWithoutScanFindingsInput
    routeFindings?: EscalationRouteFindingCreateNestedManyWithoutScanFindingInput
  }

  export type ScanFindingUncheckedCreateWithoutScanTacticInput = {
    id: string
    scanRunId: string
    agentId: string
    severity: string
    confidence: number
    title: string
    description: string
    evidence: string
    technique: string
    reproduceCommand?: string | null
    validated?: boolean
    validationStatus?: string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: string | null
    createdAt?: Date | string
    routeFindings?: EscalationRouteFindingUncheckedCreateNestedManyWithoutScanFindingInput
  }

  export type ScanFindingCreateOrConnectWithoutScanTacticInput = {
    where: ScanFindingWhereUniqueInput
    create: XOR<ScanFindingCreateWithoutScanTacticInput, ScanFindingUncheckedCreateWithoutScanTacticInput>
  }

  export type ScanFindingCreateManyScanTacticInputEnvelope = {
    data: ScanFindingCreateManyScanTacticInput | ScanFindingCreateManyScanTacticInput[]
    skipDuplicates?: boolean
  }

  export type ScanRunUpsertWithoutScanTacticsInput = {
    update: XOR<ScanRunUpdateWithoutScanTacticsInput, ScanRunUncheckedUpdateWithoutScanTacticsInput>
    create: XOR<ScanRunCreateWithoutScanTacticsInput, ScanRunUncheckedCreateWithoutScanTacticsInput>
    where?: ScanRunWhereInput
  }

  export type ScanRunUpdateToOneWithWhereWithoutScanTacticsInput = {
    where?: ScanRunWhereInput
    data: XOR<ScanRunUpdateWithoutScanTacticsInput, ScanRunUncheckedUpdateWithoutScanTacticsInput>
  }

  export type ScanRunUpdateWithoutScanTacticsInput = {
    id?: StringFieldUpdateOperationsInput | string
    scope?: JsonNullValueInput | InputJsonValue
    status?: EnumScanRunStatusFieldUpdateOperationsInput | $Enums.ScanRunStatus
    currentRound?: IntFieldUpdateOperationsInput | number
    tacticsTotal?: IntFieldUpdateOperationsInput | number
    tacticsComplete?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scanFindings?: ScanFindingUpdateManyWithoutScanRunNestedInput
    scanAuditEntries?: ScanAuditEntryUpdateManyWithoutScanRunNestedInput
    escalationRoutes?: EscalationRouteUpdateManyWithoutScanRunNestedInput
  }

  export type ScanRunUncheckedUpdateWithoutScanTacticsInput = {
    id?: StringFieldUpdateOperationsInput | string
    scope?: JsonNullValueInput | InputJsonValue
    status?: EnumScanRunStatusFieldUpdateOperationsInput | $Enums.ScanRunStatus
    currentRound?: IntFieldUpdateOperationsInput | number
    tacticsTotal?: IntFieldUpdateOperationsInput | number
    tacticsComplete?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scanFindings?: ScanFindingUncheckedUpdateManyWithoutScanRunNestedInput
    scanAuditEntries?: ScanAuditEntryUncheckedUpdateManyWithoutScanRunNestedInput
    escalationRoutes?: EscalationRouteUncheckedUpdateManyWithoutScanRunNestedInput
  }

  export type ScanTacticUpsertWithoutChildTacticsInput = {
    update: XOR<ScanTacticUpdateWithoutChildTacticsInput, ScanTacticUncheckedUpdateWithoutChildTacticsInput>
    create: XOR<ScanTacticCreateWithoutChildTacticsInput, ScanTacticUncheckedCreateWithoutChildTacticsInput>
    where?: ScanTacticWhereInput
  }

  export type ScanTacticUpdateToOneWithWhereWithoutChildTacticsInput = {
    where?: ScanTacticWhereInput
    data: XOR<ScanTacticUpdateWithoutChildTacticsInput, ScanTacticUncheckedUpdateWithoutChildTacticsInput>
  }

  export type ScanTacticUpdateWithoutChildTacticsInput = {
    id?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    layer?: StringFieldUpdateOperationsInput | string
    service?: NullableStringFieldUpdateOperationsInput | string | null
    port?: NullableIntFieldUpdateOperationsInput | number | null
    riskScore?: FloatFieldUpdateOperationsInput | number
    status?: EnumScanTacticStatusFieldUpdateOperationsInput | $Enums.ScanTacticStatus
    depth?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    scanRun?: ScanRunUpdateOneRequiredWithoutScanTacticsNestedInput
    parentTactic?: ScanTacticUpdateOneWithoutChildTacticsNestedInput
    scanFindings?: ScanFindingUpdateManyWithoutScanTacticNestedInput
  }

  export type ScanTacticUncheckedUpdateWithoutChildTacticsInput = {
    id?: StringFieldUpdateOperationsInput | string
    scanRunId?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    layer?: StringFieldUpdateOperationsInput | string
    service?: NullableStringFieldUpdateOperationsInput | string | null
    port?: NullableIntFieldUpdateOperationsInput | number | null
    riskScore?: FloatFieldUpdateOperationsInput | number
    status?: EnumScanTacticStatusFieldUpdateOperationsInput | $Enums.ScanTacticStatus
    parentTacticId?: NullableStringFieldUpdateOperationsInput | string | null
    depth?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    scanFindings?: ScanFindingUncheckedUpdateManyWithoutScanTacticNestedInput
  }

  export type ScanTacticUpsertWithWhereUniqueWithoutParentTacticInput = {
    where: ScanTacticWhereUniqueInput
    update: XOR<ScanTacticUpdateWithoutParentTacticInput, ScanTacticUncheckedUpdateWithoutParentTacticInput>
    create: XOR<ScanTacticCreateWithoutParentTacticInput, ScanTacticUncheckedCreateWithoutParentTacticInput>
  }

  export type ScanTacticUpdateWithWhereUniqueWithoutParentTacticInput = {
    where: ScanTacticWhereUniqueInput
    data: XOR<ScanTacticUpdateWithoutParentTacticInput, ScanTacticUncheckedUpdateWithoutParentTacticInput>
  }

  export type ScanTacticUpdateManyWithWhereWithoutParentTacticInput = {
    where: ScanTacticScalarWhereInput
    data: XOR<ScanTacticUpdateManyMutationInput, ScanTacticUncheckedUpdateManyWithoutParentTacticInput>
  }

  export type ScanFindingUpsertWithWhereUniqueWithoutScanTacticInput = {
    where: ScanFindingWhereUniqueInput
    update: XOR<ScanFindingUpdateWithoutScanTacticInput, ScanFindingUncheckedUpdateWithoutScanTacticInput>
    create: XOR<ScanFindingCreateWithoutScanTacticInput, ScanFindingUncheckedCreateWithoutScanTacticInput>
  }

  export type ScanFindingUpdateWithWhereUniqueWithoutScanTacticInput = {
    where: ScanFindingWhereUniqueInput
    data: XOR<ScanFindingUpdateWithoutScanTacticInput, ScanFindingUncheckedUpdateWithoutScanTacticInput>
  }

  export type ScanFindingUpdateManyWithWhereWithoutScanTacticInput = {
    where: ScanFindingScalarWhereInput
    data: XOR<ScanFindingUpdateManyMutationInput, ScanFindingUncheckedUpdateManyWithoutScanTacticInput>
  }

  export type ScanRunCreateWithoutScanFindingsInput = {
    id: string
    scope: JsonNullValueInput | InputJsonValue
    status: $Enums.ScanRunStatus
    currentRound?: number
    tacticsTotal?: number
    tacticsComplete?: number
    createdAt?: Date | string
    completedAt?: Date | string | null
    scanTactics?: ScanTacticCreateNestedManyWithoutScanRunInput
    scanAuditEntries?: ScanAuditEntryCreateNestedManyWithoutScanRunInput
    escalationRoutes?: EscalationRouteCreateNestedManyWithoutScanRunInput
  }

  export type ScanRunUncheckedCreateWithoutScanFindingsInput = {
    id: string
    scope: JsonNullValueInput | InputJsonValue
    status: $Enums.ScanRunStatus
    currentRound?: number
    tacticsTotal?: number
    tacticsComplete?: number
    createdAt?: Date | string
    completedAt?: Date | string | null
    scanTactics?: ScanTacticUncheckedCreateNestedManyWithoutScanRunInput
    scanAuditEntries?: ScanAuditEntryUncheckedCreateNestedManyWithoutScanRunInput
    escalationRoutes?: EscalationRouteUncheckedCreateNestedManyWithoutScanRunInput
  }

  export type ScanRunCreateOrConnectWithoutScanFindingsInput = {
    where: ScanRunWhereUniqueInput
    create: XOR<ScanRunCreateWithoutScanFindingsInput, ScanRunUncheckedCreateWithoutScanFindingsInput>
  }

  export type ScanTacticCreateWithoutScanFindingsInput = {
    id: string
    target: string
    layer: string
    service?: string | null
    port?: number | null
    riskScore: number
    status: $Enums.ScanTacticStatus
    depth: number
    createdAt?: Date | string
    scanRun: ScanRunCreateNestedOneWithoutScanTacticsInput
    parentTactic?: ScanTacticCreateNestedOneWithoutChildTacticsInput
    childTactics?: ScanTacticCreateNestedManyWithoutParentTacticInput
  }

  export type ScanTacticUncheckedCreateWithoutScanFindingsInput = {
    id: string
    scanRunId: string
    target: string
    layer: string
    service?: string | null
    port?: number | null
    riskScore: number
    status: $Enums.ScanTacticStatus
    parentTacticId?: string | null
    depth: number
    createdAt?: Date | string
    childTactics?: ScanTacticUncheckedCreateNestedManyWithoutParentTacticInput
  }

  export type ScanTacticCreateOrConnectWithoutScanFindingsInput = {
    where: ScanTacticWhereUniqueInput
    create: XOR<ScanTacticCreateWithoutScanFindingsInput, ScanTacticUncheckedCreateWithoutScanFindingsInput>
  }

  export type EscalationRouteFindingCreateWithoutScanFindingInput = {
    ord: number
    linkProbability?: number | null
    escalationRoute: EscalationRouteCreateNestedOneWithoutRouteFindingsInput
  }

  export type EscalationRouteFindingUncheckedCreateWithoutScanFindingInput = {
    escalationRouteId: string
    ord: number
    linkProbability?: number | null
  }

  export type EscalationRouteFindingCreateOrConnectWithoutScanFindingInput = {
    where: EscalationRouteFindingWhereUniqueInput
    create: XOR<EscalationRouteFindingCreateWithoutScanFindingInput, EscalationRouteFindingUncheckedCreateWithoutScanFindingInput>
  }

  export type EscalationRouteFindingCreateManyScanFindingInputEnvelope = {
    data: EscalationRouteFindingCreateManyScanFindingInput | EscalationRouteFindingCreateManyScanFindingInput[]
    skipDuplicates?: boolean
  }

  export type ScanRunUpsertWithoutScanFindingsInput = {
    update: XOR<ScanRunUpdateWithoutScanFindingsInput, ScanRunUncheckedUpdateWithoutScanFindingsInput>
    create: XOR<ScanRunCreateWithoutScanFindingsInput, ScanRunUncheckedCreateWithoutScanFindingsInput>
    where?: ScanRunWhereInput
  }

  export type ScanRunUpdateToOneWithWhereWithoutScanFindingsInput = {
    where?: ScanRunWhereInput
    data: XOR<ScanRunUpdateWithoutScanFindingsInput, ScanRunUncheckedUpdateWithoutScanFindingsInput>
  }

  export type ScanRunUpdateWithoutScanFindingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    scope?: JsonNullValueInput | InputJsonValue
    status?: EnumScanRunStatusFieldUpdateOperationsInput | $Enums.ScanRunStatus
    currentRound?: IntFieldUpdateOperationsInput | number
    tacticsTotal?: IntFieldUpdateOperationsInput | number
    tacticsComplete?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scanTactics?: ScanTacticUpdateManyWithoutScanRunNestedInput
    scanAuditEntries?: ScanAuditEntryUpdateManyWithoutScanRunNestedInput
    escalationRoutes?: EscalationRouteUpdateManyWithoutScanRunNestedInput
  }

  export type ScanRunUncheckedUpdateWithoutScanFindingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    scope?: JsonNullValueInput | InputJsonValue
    status?: EnumScanRunStatusFieldUpdateOperationsInput | $Enums.ScanRunStatus
    currentRound?: IntFieldUpdateOperationsInput | number
    tacticsTotal?: IntFieldUpdateOperationsInput | number
    tacticsComplete?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scanTactics?: ScanTacticUncheckedUpdateManyWithoutScanRunNestedInput
    scanAuditEntries?: ScanAuditEntryUncheckedUpdateManyWithoutScanRunNestedInput
    escalationRoutes?: EscalationRouteUncheckedUpdateManyWithoutScanRunNestedInput
  }

  export type ScanTacticUpsertWithoutScanFindingsInput = {
    update: XOR<ScanTacticUpdateWithoutScanFindingsInput, ScanTacticUncheckedUpdateWithoutScanFindingsInput>
    create: XOR<ScanTacticCreateWithoutScanFindingsInput, ScanTacticUncheckedCreateWithoutScanFindingsInput>
    where?: ScanTacticWhereInput
  }

  export type ScanTacticUpdateToOneWithWhereWithoutScanFindingsInput = {
    where?: ScanTacticWhereInput
    data: XOR<ScanTacticUpdateWithoutScanFindingsInput, ScanTacticUncheckedUpdateWithoutScanFindingsInput>
  }

  export type ScanTacticUpdateWithoutScanFindingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    layer?: StringFieldUpdateOperationsInput | string
    service?: NullableStringFieldUpdateOperationsInput | string | null
    port?: NullableIntFieldUpdateOperationsInput | number | null
    riskScore?: FloatFieldUpdateOperationsInput | number
    status?: EnumScanTacticStatusFieldUpdateOperationsInput | $Enums.ScanTacticStatus
    depth?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    scanRun?: ScanRunUpdateOneRequiredWithoutScanTacticsNestedInput
    parentTactic?: ScanTacticUpdateOneWithoutChildTacticsNestedInput
    childTactics?: ScanTacticUpdateManyWithoutParentTacticNestedInput
  }

  export type ScanTacticUncheckedUpdateWithoutScanFindingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    scanRunId?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    layer?: StringFieldUpdateOperationsInput | string
    service?: NullableStringFieldUpdateOperationsInput | string | null
    port?: NullableIntFieldUpdateOperationsInput | number | null
    riskScore?: FloatFieldUpdateOperationsInput | number
    status?: EnumScanTacticStatusFieldUpdateOperationsInput | $Enums.ScanTacticStatus
    parentTacticId?: NullableStringFieldUpdateOperationsInput | string | null
    depth?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    childTactics?: ScanTacticUncheckedUpdateManyWithoutParentTacticNestedInput
  }

  export type EscalationRouteFindingUpsertWithWhereUniqueWithoutScanFindingInput = {
    where: EscalationRouteFindingWhereUniqueInput
    update: XOR<EscalationRouteFindingUpdateWithoutScanFindingInput, EscalationRouteFindingUncheckedUpdateWithoutScanFindingInput>
    create: XOR<EscalationRouteFindingCreateWithoutScanFindingInput, EscalationRouteFindingUncheckedCreateWithoutScanFindingInput>
  }

  export type EscalationRouteFindingUpdateWithWhereUniqueWithoutScanFindingInput = {
    where: EscalationRouteFindingWhereUniqueInput
    data: XOR<EscalationRouteFindingUpdateWithoutScanFindingInput, EscalationRouteFindingUncheckedUpdateWithoutScanFindingInput>
  }

  export type EscalationRouteFindingUpdateManyWithWhereWithoutScanFindingInput = {
    where: EscalationRouteFindingScalarWhereInput
    data: XOR<EscalationRouteFindingUpdateManyMutationInput, EscalationRouteFindingUncheckedUpdateManyWithoutScanFindingInput>
  }

  export type EscalationRouteFindingScalarWhereInput = {
    AND?: EscalationRouteFindingScalarWhereInput | EscalationRouteFindingScalarWhereInput[]
    OR?: EscalationRouteFindingScalarWhereInput[]
    NOT?: EscalationRouteFindingScalarWhereInput | EscalationRouteFindingScalarWhereInput[]
    escalationRouteId?: UuidFilter<"EscalationRouteFinding"> | string
    scanFindingId?: UuidFilter<"EscalationRouteFinding"> | string
    ord?: IntFilter<"EscalationRouteFinding"> | number
    linkProbability?: FloatNullableFilter<"EscalationRouteFinding"> | number | null
  }

  export type ScanRunCreateWithoutScanAuditEntriesInput = {
    id: string
    scope: JsonNullValueInput | InputJsonValue
    status: $Enums.ScanRunStatus
    currentRound?: number
    tacticsTotal?: number
    tacticsComplete?: number
    createdAt?: Date | string
    completedAt?: Date | string | null
    scanTactics?: ScanTacticCreateNestedManyWithoutScanRunInput
    scanFindings?: ScanFindingCreateNestedManyWithoutScanRunInput
    escalationRoutes?: EscalationRouteCreateNestedManyWithoutScanRunInput
  }

  export type ScanRunUncheckedCreateWithoutScanAuditEntriesInput = {
    id: string
    scope: JsonNullValueInput | InputJsonValue
    status: $Enums.ScanRunStatus
    currentRound?: number
    tacticsTotal?: number
    tacticsComplete?: number
    createdAt?: Date | string
    completedAt?: Date | string | null
    scanTactics?: ScanTacticUncheckedCreateNestedManyWithoutScanRunInput
    scanFindings?: ScanFindingUncheckedCreateNestedManyWithoutScanRunInput
    escalationRoutes?: EscalationRouteUncheckedCreateNestedManyWithoutScanRunInput
  }

  export type ScanRunCreateOrConnectWithoutScanAuditEntriesInput = {
    where: ScanRunWhereUniqueInput
    create: XOR<ScanRunCreateWithoutScanAuditEntriesInput, ScanRunUncheckedCreateWithoutScanAuditEntriesInput>
  }

  export type ScanRunUpsertWithoutScanAuditEntriesInput = {
    update: XOR<ScanRunUpdateWithoutScanAuditEntriesInput, ScanRunUncheckedUpdateWithoutScanAuditEntriesInput>
    create: XOR<ScanRunCreateWithoutScanAuditEntriesInput, ScanRunUncheckedCreateWithoutScanAuditEntriesInput>
    where?: ScanRunWhereInput
  }

  export type ScanRunUpdateToOneWithWhereWithoutScanAuditEntriesInput = {
    where?: ScanRunWhereInput
    data: XOR<ScanRunUpdateWithoutScanAuditEntriesInput, ScanRunUncheckedUpdateWithoutScanAuditEntriesInput>
  }

  export type ScanRunUpdateWithoutScanAuditEntriesInput = {
    id?: StringFieldUpdateOperationsInput | string
    scope?: JsonNullValueInput | InputJsonValue
    status?: EnumScanRunStatusFieldUpdateOperationsInput | $Enums.ScanRunStatus
    currentRound?: IntFieldUpdateOperationsInput | number
    tacticsTotal?: IntFieldUpdateOperationsInput | number
    tacticsComplete?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scanTactics?: ScanTacticUpdateManyWithoutScanRunNestedInput
    scanFindings?: ScanFindingUpdateManyWithoutScanRunNestedInput
    escalationRoutes?: EscalationRouteUpdateManyWithoutScanRunNestedInput
  }

  export type ScanRunUncheckedUpdateWithoutScanAuditEntriesInput = {
    id?: StringFieldUpdateOperationsInput | string
    scope?: JsonNullValueInput | InputJsonValue
    status?: EnumScanRunStatusFieldUpdateOperationsInput | $Enums.ScanRunStatus
    currentRound?: IntFieldUpdateOperationsInput | number
    tacticsTotal?: IntFieldUpdateOperationsInput | number
    tacticsComplete?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scanTactics?: ScanTacticUncheckedUpdateManyWithoutScanRunNestedInput
    scanFindings?: ScanFindingUncheckedUpdateManyWithoutScanRunNestedInput
    escalationRoutes?: EscalationRouteUncheckedUpdateManyWithoutScanRunNestedInput
  }

  export type ScanRunCreateWithoutEscalationRoutesInput = {
    id: string
    scope: JsonNullValueInput | InputJsonValue
    status: $Enums.ScanRunStatus
    currentRound?: number
    tacticsTotal?: number
    tacticsComplete?: number
    createdAt?: Date | string
    completedAt?: Date | string | null
    scanTactics?: ScanTacticCreateNestedManyWithoutScanRunInput
    scanFindings?: ScanFindingCreateNestedManyWithoutScanRunInput
    scanAuditEntries?: ScanAuditEntryCreateNestedManyWithoutScanRunInput
  }

  export type ScanRunUncheckedCreateWithoutEscalationRoutesInput = {
    id: string
    scope: JsonNullValueInput | InputJsonValue
    status: $Enums.ScanRunStatus
    currentRound?: number
    tacticsTotal?: number
    tacticsComplete?: number
    createdAt?: Date | string
    completedAt?: Date | string | null
    scanTactics?: ScanTacticUncheckedCreateNestedManyWithoutScanRunInput
    scanFindings?: ScanFindingUncheckedCreateNestedManyWithoutScanRunInput
    scanAuditEntries?: ScanAuditEntryUncheckedCreateNestedManyWithoutScanRunInput
  }

  export type ScanRunCreateOrConnectWithoutEscalationRoutesInput = {
    where: ScanRunWhereUniqueInput
    create: XOR<ScanRunCreateWithoutEscalationRoutesInput, ScanRunUncheckedCreateWithoutEscalationRoutesInput>
  }

  export type EscalationRouteFindingCreateWithoutEscalationRouteInput = {
    ord: number
    linkProbability?: number | null
    scanFinding: ScanFindingCreateNestedOneWithoutRouteFindingsInput
  }

  export type EscalationRouteFindingUncheckedCreateWithoutEscalationRouteInput = {
    scanFindingId: string
    ord: number
    linkProbability?: number | null
  }

  export type EscalationRouteFindingCreateOrConnectWithoutEscalationRouteInput = {
    where: EscalationRouteFindingWhereUniqueInput
    create: XOR<EscalationRouteFindingCreateWithoutEscalationRouteInput, EscalationRouteFindingUncheckedCreateWithoutEscalationRouteInput>
  }

  export type EscalationRouteFindingCreateManyEscalationRouteInputEnvelope = {
    data: EscalationRouteFindingCreateManyEscalationRouteInput | EscalationRouteFindingCreateManyEscalationRouteInput[]
    skipDuplicates?: boolean
  }

  export type ScanRunUpsertWithoutEscalationRoutesInput = {
    update: XOR<ScanRunUpdateWithoutEscalationRoutesInput, ScanRunUncheckedUpdateWithoutEscalationRoutesInput>
    create: XOR<ScanRunCreateWithoutEscalationRoutesInput, ScanRunUncheckedCreateWithoutEscalationRoutesInput>
    where?: ScanRunWhereInput
  }

  export type ScanRunUpdateToOneWithWhereWithoutEscalationRoutesInput = {
    where?: ScanRunWhereInput
    data: XOR<ScanRunUpdateWithoutEscalationRoutesInput, ScanRunUncheckedUpdateWithoutEscalationRoutesInput>
  }

  export type ScanRunUpdateWithoutEscalationRoutesInput = {
    id?: StringFieldUpdateOperationsInput | string
    scope?: JsonNullValueInput | InputJsonValue
    status?: EnumScanRunStatusFieldUpdateOperationsInput | $Enums.ScanRunStatus
    currentRound?: IntFieldUpdateOperationsInput | number
    tacticsTotal?: IntFieldUpdateOperationsInput | number
    tacticsComplete?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scanTactics?: ScanTacticUpdateManyWithoutScanRunNestedInput
    scanFindings?: ScanFindingUpdateManyWithoutScanRunNestedInput
    scanAuditEntries?: ScanAuditEntryUpdateManyWithoutScanRunNestedInput
  }

  export type ScanRunUncheckedUpdateWithoutEscalationRoutesInput = {
    id?: StringFieldUpdateOperationsInput | string
    scope?: JsonNullValueInput | InputJsonValue
    status?: EnumScanRunStatusFieldUpdateOperationsInput | $Enums.ScanRunStatus
    currentRound?: IntFieldUpdateOperationsInput | number
    tacticsTotal?: IntFieldUpdateOperationsInput | number
    tacticsComplete?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scanTactics?: ScanTacticUncheckedUpdateManyWithoutScanRunNestedInput
    scanFindings?: ScanFindingUncheckedUpdateManyWithoutScanRunNestedInput
    scanAuditEntries?: ScanAuditEntryUncheckedUpdateManyWithoutScanRunNestedInput
  }

  export type EscalationRouteFindingUpsertWithWhereUniqueWithoutEscalationRouteInput = {
    where: EscalationRouteFindingWhereUniqueInput
    update: XOR<EscalationRouteFindingUpdateWithoutEscalationRouteInput, EscalationRouteFindingUncheckedUpdateWithoutEscalationRouteInput>
    create: XOR<EscalationRouteFindingCreateWithoutEscalationRouteInput, EscalationRouteFindingUncheckedCreateWithoutEscalationRouteInput>
  }

  export type EscalationRouteFindingUpdateWithWhereUniqueWithoutEscalationRouteInput = {
    where: EscalationRouteFindingWhereUniqueInput
    data: XOR<EscalationRouteFindingUpdateWithoutEscalationRouteInput, EscalationRouteFindingUncheckedUpdateWithoutEscalationRouteInput>
  }

  export type EscalationRouteFindingUpdateManyWithWhereWithoutEscalationRouteInput = {
    where: EscalationRouteFindingScalarWhereInput
    data: XOR<EscalationRouteFindingUpdateManyMutationInput, EscalationRouteFindingUncheckedUpdateManyWithoutEscalationRouteInput>
  }

  export type EscalationRouteCreateWithoutRouteFindingsInput = {
    id: string
    title: string
    compositeRisk: number
    technique: string
    startTarget: string
    endTarget: string
    routeLength: number
    confidence: number
    narrative?: string | null
    createdAt?: Date | string
    scanRun: ScanRunCreateNestedOneWithoutEscalationRoutesInput
  }

  export type EscalationRouteUncheckedCreateWithoutRouteFindingsInput = {
    id: string
    scanRunId: string
    title: string
    compositeRisk: number
    technique: string
    startTarget: string
    endTarget: string
    routeLength: number
    confidence: number
    narrative?: string | null
    createdAt?: Date | string
  }

  export type EscalationRouteCreateOrConnectWithoutRouteFindingsInput = {
    where: EscalationRouteWhereUniqueInput
    create: XOR<EscalationRouteCreateWithoutRouteFindingsInput, EscalationRouteUncheckedCreateWithoutRouteFindingsInput>
  }

  export type ScanFindingCreateWithoutRouteFindingsInput = {
    id: string
    agentId: string
    severity: string
    confidence: number
    title: string
    description: string
    evidence: string
    technique: string
    reproduceCommand?: string | null
    validated?: boolean
    validationStatus?: string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: string | null
    createdAt?: Date | string
    scanRun: ScanRunCreateNestedOneWithoutScanFindingsInput
    scanTactic: ScanTacticCreateNestedOneWithoutScanFindingsInput
  }

  export type ScanFindingUncheckedCreateWithoutRouteFindingsInput = {
    id: string
    scanRunId: string
    scanTacticId: string
    agentId: string
    severity: string
    confidence: number
    title: string
    description: string
    evidence: string
    technique: string
    reproduceCommand?: string | null
    validated?: boolean
    validationStatus?: string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: string | null
    createdAt?: Date | string
  }

  export type ScanFindingCreateOrConnectWithoutRouteFindingsInput = {
    where: ScanFindingWhereUniqueInput
    create: XOR<ScanFindingCreateWithoutRouteFindingsInput, ScanFindingUncheckedCreateWithoutRouteFindingsInput>
  }

  export type EscalationRouteUpsertWithoutRouteFindingsInput = {
    update: XOR<EscalationRouteUpdateWithoutRouteFindingsInput, EscalationRouteUncheckedUpdateWithoutRouteFindingsInput>
    create: XOR<EscalationRouteCreateWithoutRouteFindingsInput, EscalationRouteUncheckedCreateWithoutRouteFindingsInput>
    where?: EscalationRouteWhereInput
  }

  export type EscalationRouteUpdateToOneWithWhereWithoutRouteFindingsInput = {
    where?: EscalationRouteWhereInput
    data: XOR<EscalationRouteUpdateWithoutRouteFindingsInput, EscalationRouteUncheckedUpdateWithoutRouteFindingsInput>
  }

  export type EscalationRouteUpdateWithoutRouteFindingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    compositeRisk?: FloatFieldUpdateOperationsInput | number
    technique?: StringFieldUpdateOperationsInput | string
    startTarget?: StringFieldUpdateOperationsInput | string
    endTarget?: StringFieldUpdateOperationsInput | string
    routeLength?: IntFieldUpdateOperationsInput | number
    confidence?: FloatFieldUpdateOperationsInput | number
    narrative?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    scanRun?: ScanRunUpdateOneRequiredWithoutEscalationRoutesNestedInput
  }

  export type EscalationRouteUncheckedUpdateWithoutRouteFindingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    scanRunId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    compositeRisk?: FloatFieldUpdateOperationsInput | number
    technique?: StringFieldUpdateOperationsInput | string
    startTarget?: StringFieldUpdateOperationsInput | string
    endTarget?: StringFieldUpdateOperationsInput | string
    routeLength?: IntFieldUpdateOperationsInput | number
    confidence?: FloatFieldUpdateOperationsInput | number
    narrative?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScanFindingUpsertWithoutRouteFindingsInput = {
    update: XOR<ScanFindingUpdateWithoutRouteFindingsInput, ScanFindingUncheckedUpdateWithoutRouteFindingsInput>
    create: XOR<ScanFindingCreateWithoutRouteFindingsInput, ScanFindingUncheckedCreateWithoutRouteFindingsInput>
    where?: ScanFindingWhereInput
  }

  export type ScanFindingUpdateToOneWithWhereWithoutRouteFindingsInput = {
    where?: ScanFindingWhereInput
    data: XOR<ScanFindingUpdateWithoutRouteFindingsInput, ScanFindingUncheckedUpdateWithoutRouteFindingsInput>
  }

  export type ScanFindingUpdateWithoutRouteFindingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    agentId?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    evidence?: StringFieldUpdateOperationsInput | string
    technique?: StringFieldUpdateOperationsInput | string
    reproduceCommand?: NullableStringFieldUpdateOperationsInput | string | null
    validated?: BoolFieldUpdateOperationsInput | boolean
    validationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    scanRun?: ScanRunUpdateOneRequiredWithoutScanFindingsNestedInput
    scanTactic?: ScanTacticUpdateOneRequiredWithoutScanFindingsNestedInput
  }

  export type ScanFindingUncheckedUpdateWithoutRouteFindingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    scanRunId?: StringFieldUpdateOperationsInput | string
    scanTacticId?: StringFieldUpdateOperationsInput | string
    agentId?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    evidence?: StringFieldUpdateOperationsInput | string
    technique?: StringFieldUpdateOperationsInput | string
    reproduceCommand?: NullableStringFieldUpdateOperationsInput | string | null
    validated?: BoolFieldUpdateOperationsInput | boolean
    validationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RuntimeCreateManyApplicationInput = {
    id: string
    name: string
    serviceType: $Enums.RuntimeServiceType
    provider: $Enums.RuntimeProvider
    environment: $Enums.ApplicationEnvironment
    region: string
    status: $Enums.RuntimeStatus
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RuntimeUpdateWithoutApplicationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    serviceType?: EnumRuntimeServiceTypeFieldUpdateOperationsInput | $Enums.RuntimeServiceType
    provider?: EnumRuntimeProviderFieldUpdateOperationsInput | $Enums.RuntimeProvider
    environment?: EnumApplicationEnvironmentFieldUpdateOperationsInput | $Enums.ApplicationEnvironment
    region?: StringFieldUpdateOperationsInput | string
    status?: EnumRuntimeStatusFieldUpdateOperationsInput | $Enums.RuntimeStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RuntimeUncheckedUpdateWithoutApplicationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    serviceType?: EnumRuntimeServiceTypeFieldUpdateOperationsInput | $Enums.RuntimeServiceType
    provider?: EnumRuntimeProviderFieldUpdateOperationsInput | $Enums.RuntimeProvider
    environment?: EnumApplicationEnvironmentFieldUpdateOperationsInput | $Enums.ApplicationEnvironment
    region?: StringFieldUpdateOperationsInput | string
    status?: EnumRuntimeStatusFieldUpdateOperationsInput | $Enums.RuntimeStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RuntimeUncheckedUpdateManyWithoutApplicationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    serviceType?: EnumRuntimeServiceTypeFieldUpdateOperationsInput | $Enums.RuntimeServiceType
    provider?: EnumRuntimeProviderFieldUpdateOperationsInput | $Enums.RuntimeProvider
    environment?: EnumApplicationEnvironmentFieldUpdateOperationsInput | $Enums.ApplicationEnvironment
    region?: StringFieldUpdateOperationsInput | string
    status?: EnumRuntimeStatusFieldUpdateOperationsInput | $Enums.RuntimeStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiAgentCreateManyProviderInput = {
    id: string
    name: string
    status: $Enums.AiAgentStatus
    description?: string | null
    systemPrompt: string
    modelOverride?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AiAgentUpdateWithoutProviderInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    status?: EnumAiAgentStatusFieldUpdateOperationsInput | $Enums.AiAgentStatus
    description?: NullableStringFieldUpdateOperationsInput | string | null
    systemPrompt?: StringFieldUpdateOperationsInput | string
    modelOverride?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tools?: AiAgentToolUpdateManyWithoutAgentNestedInput
  }

  export type AiAgentUncheckedUpdateWithoutProviderInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    status?: EnumAiAgentStatusFieldUpdateOperationsInput | $Enums.AiAgentStatus
    description?: NullableStringFieldUpdateOperationsInput | string | null
    systemPrompt?: StringFieldUpdateOperationsInput | string
    modelOverride?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tools?: AiAgentToolUncheckedUpdateManyWithoutAgentNestedInput
  }

  export type AiAgentUncheckedUpdateManyWithoutProviderInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    status?: EnumAiAgentStatusFieldUpdateOperationsInput | $Enums.AiAgentStatus
    description?: NullableStringFieldUpdateOperationsInput | string | null
    systemPrompt?: StringFieldUpdateOperationsInput | string
    modelOverride?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiAgentToolCreateManyAgentInput = {
    toolId: string
    ord: number
  }

  export type AiAgentToolUpdateWithoutAgentInput = {
    ord?: IntFieldUpdateOperationsInput | number
    tool?: AiToolUpdateOneRequiredWithoutAgentsNestedInput
  }

  export type AiAgentToolUncheckedUpdateWithoutAgentInput = {
    toolId?: StringFieldUpdateOperationsInput | string
    ord?: IntFieldUpdateOperationsInput | number
  }

  export type AiAgentToolUncheckedUpdateManyWithoutAgentInput = {
    toolId?: StringFieldUpdateOperationsInput | string
    ord?: IntFieldUpdateOperationsInput | number
  }

  export type AiAgentToolCreateManyToolInput = {
    agentId: string
    ord: number
  }

  export type AiAgentToolUpdateWithoutToolInput = {
    ord?: IntFieldUpdateOperationsInput | number
    agent?: AiAgentUpdateOneRequiredWithoutToolsNestedInput
  }

  export type AiAgentToolUncheckedUpdateWithoutToolInput = {
    agentId?: StringFieldUpdateOperationsInput | string
    ord?: IntFieldUpdateOperationsInput | number
  }

  export type AiAgentToolUncheckedUpdateManyWithoutToolInput = {
    agentId?: StringFieldUpdateOperationsInput | string
    ord?: IntFieldUpdateOperationsInput | number
  }

  export type ScanTacticCreateManyScanRunInput = {
    id: string
    target: string
    layer: string
    service?: string | null
    port?: number | null
    riskScore: number
    status: $Enums.ScanTacticStatus
    parentTacticId?: string | null
    depth: number
    createdAt?: Date | string
  }

  export type ScanFindingCreateManyScanRunInput = {
    id: string
    scanTacticId: string
    agentId: string
    severity: string
    confidence: number
    title: string
    description: string
    evidence: string
    technique: string
    reproduceCommand?: string | null
    validated?: boolean
    validationStatus?: string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: string | null
    createdAt?: Date | string
  }

  export type ScanAuditEntryCreateManyScanRunInput = {
    id: string
    timestamp: Date | string
    actor: string
    action: string
    targetTacticId?: string | null
    scopeValid: boolean
    details: JsonNullValueInput | InputJsonValue
  }

  export type EscalationRouteCreateManyScanRunInput = {
    id: string
    title: string
    compositeRisk: number
    technique: string
    startTarget: string
    endTarget: string
    routeLength: number
    confidence: number
    narrative?: string | null
    createdAt?: Date | string
  }

  export type ScanTacticUpdateWithoutScanRunInput = {
    id?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    layer?: StringFieldUpdateOperationsInput | string
    service?: NullableStringFieldUpdateOperationsInput | string | null
    port?: NullableIntFieldUpdateOperationsInput | number | null
    riskScore?: FloatFieldUpdateOperationsInput | number
    status?: EnumScanTacticStatusFieldUpdateOperationsInput | $Enums.ScanTacticStatus
    depth?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    parentTactic?: ScanTacticUpdateOneWithoutChildTacticsNestedInput
    childTactics?: ScanTacticUpdateManyWithoutParentTacticNestedInput
    scanFindings?: ScanFindingUpdateManyWithoutScanTacticNestedInput
  }

  export type ScanTacticUncheckedUpdateWithoutScanRunInput = {
    id?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    layer?: StringFieldUpdateOperationsInput | string
    service?: NullableStringFieldUpdateOperationsInput | string | null
    port?: NullableIntFieldUpdateOperationsInput | number | null
    riskScore?: FloatFieldUpdateOperationsInput | number
    status?: EnumScanTacticStatusFieldUpdateOperationsInput | $Enums.ScanTacticStatus
    parentTacticId?: NullableStringFieldUpdateOperationsInput | string | null
    depth?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    childTactics?: ScanTacticUncheckedUpdateManyWithoutParentTacticNestedInput
    scanFindings?: ScanFindingUncheckedUpdateManyWithoutScanTacticNestedInput
  }

  export type ScanTacticUncheckedUpdateManyWithoutScanRunInput = {
    id?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    layer?: StringFieldUpdateOperationsInput | string
    service?: NullableStringFieldUpdateOperationsInput | string | null
    port?: NullableIntFieldUpdateOperationsInput | number | null
    riskScore?: FloatFieldUpdateOperationsInput | number
    status?: EnumScanTacticStatusFieldUpdateOperationsInput | $Enums.ScanTacticStatus
    parentTacticId?: NullableStringFieldUpdateOperationsInput | string | null
    depth?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScanFindingUpdateWithoutScanRunInput = {
    id?: StringFieldUpdateOperationsInput | string
    agentId?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    evidence?: StringFieldUpdateOperationsInput | string
    technique?: StringFieldUpdateOperationsInput | string
    reproduceCommand?: NullableStringFieldUpdateOperationsInput | string | null
    validated?: BoolFieldUpdateOperationsInput | boolean
    validationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    scanTactic?: ScanTacticUpdateOneRequiredWithoutScanFindingsNestedInput
    routeFindings?: EscalationRouteFindingUpdateManyWithoutScanFindingNestedInput
  }

  export type ScanFindingUncheckedUpdateWithoutScanRunInput = {
    id?: StringFieldUpdateOperationsInput | string
    scanTacticId?: StringFieldUpdateOperationsInput | string
    agentId?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    evidence?: StringFieldUpdateOperationsInput | string
    technique?: StringFieldUpdateOperationsInput | string
    reproduceCommand?: NullableStringFieldUpdateOperationsInput | string | null
    validated?: BoolFieldUpdateOperationsInput | boolean
    validationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    routeFindings?: EscalationRouteFindingUncheckedUpdateManyWithoutScanFindingNestedInput
  }

  export type ScanFindingUncheckedUpdateManyWithoutScanRunInput = {
    id?: StringFieldUpdateOperationsInput | string
    scanTacticId?: StringFieldUpdateOperationsInput | string
    agentId?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    evidence?: StringFieldUpdateOperationsInput | string
    technique?: StringFieldUpdateOperationsInput | string
    reproduceCommand?: NullableStringFieldUpdateOperationsInput | string | null
    validated?: BoolFieldUpdateOperationsInput | boolean
    validationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScanAuditEntryUpdateWithoutScanRunInput = {
    id?: StringFieldUpdateOperationsInput | string
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    actor?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    targetTacticId?: NullableStringFieldUpdateOperationsInput | string | null
    scopeValid?: BoolFieldUpdateOperationsInput | boolean
    details?: JsonNullValueInput | InputJsonValue
  }

  export type ScanAuditEntryUncheckedUpdateWithoutScanRunInput = {
    id?: StringFieldUpdateOperationsInput | string
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    actor?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    targetTacticId?: NullableStringFieldUpdateOperationsInput | string | null
    scopeValid?: BoolFieldUpdateOperationsInput | boolean
    details?: JsonNullValueInput | InputJsonValue
  }

  export type ScanAuditEntryUncheckedUpdateManyWithoutScanRunInput = {
    id?: StringFieldUpdateOperationsInput | string
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    actor?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    targetTacticId?: NullableStringFieldUpdateOperationsInput | string | null
    scopeValid?: BoolFieldUpdateOperationsInput | boolean
    details?: JsonNullValueInput | InputJsonValue
  }

  export type EscalationRouteUpdateWithoutScanRunInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    compositeRisk?: FloatFieldUpdateOperationsInput | number
    technique?: StringFieldUpdateOperationsInput | string
    startTarget?: StringFieldUpdateOperationsInput | string
    endTarget?: StringFieldUpdateOperationsInput | string
    routeLength?: IntFieldUpdateOperationsInput | number
    confidence?: FloatFieldUpdateOperationsInput | number
    narrative?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    routeFindings?: EscalationRouteFindingUpdateManyWithoutEscalationRouteNestedInput
  }

  export type EscalationRouteUncheckedUpdateWithoutScanRunInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    compositeRisk?: FloatFieldUpdateOperationsInput | number
    technique?: StringFieldUpdateOperationsInput | string
    startTarget?: StringFieldUpdateOperationsInput | string
    endTarget?: StringFieldUpdateOperationsInput | string
    routeLength?: IntFieldUpdateOperationsInput | number
    confidence?: FloatFieldUpdateOperationsInput | number
    narrative?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    routeFindings?: EscalationRouteFindingUncheckedUpdateManyWithoutEscalationRouteNestedInput
  }

  export type EscalationRouteUncheckedUpdateManyWithoutScanRunInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    compositeRisk?: FloatFieldUpdateOperationsInput | number
    technique?: StringFieldUpdateOperationsInput | string
    startTarget?: StringFieldUpdateOperationsInput | string
    endTarget?: StringFieldUpdateOperationsInput | string
    routeLength?: IntFieldUpdateOperationsInput | number
    confidence?: FloatFieldUpdateOperationsInput | number
    narrative?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScanTacticCreateManyParentTacticInput = {
    id: string
    scanRunId: string
    target: string
    layer: string
    service?: string | null
    port?: number | null
    riskScore: number
    status: $Enums.ScanTacticStatus
    depth: number
    createdAt?: Date | string
  }

  export type ScanFindingCreateManyScanTacticInput = {
    id: string
    scanRunId: string
    agentId: string
    severity: string
    confidence: number
    title: string
    description: string
    evidence: string
    technique: string
    reproduceCommand?: string | null
    validated?: boolean
    validationStatus?: string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: string | null
    createdAt?: Date | string
  }

  export type ScanTacticUpdateWithoutParentTacticInput = {
    id?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    layer?: StringFieldUpdateOperationsInput | string
    service?: NullableStringFieldUpdateOperationsInput | string | null
    port?: NullableIntFieldUpdateOperationsInput | number | null
    riskScore?: FloatFieldUpdateOperationsInput | number
    status?: EnumScanTacticStatusFieldUpdateOperationsInput | $Enums.ScanTacticStatus
    depth?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    scanRun?: ScanRunUpdateOneRequiredWithoutScanTacticsNestedInput
    childTactics?: ScanTacticUpdateManyWithoutParentTacticNestedInput
    scanFindings?: ScanFindingUpdateManyWithoutScanTacticNestedInput
  }

  export type ScanTacticUncheckedUpdateWithoutParentTacticInput = {
    id?: StringFieldUpdateOperationsInput | string
    scanRunId?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    layer?: StringFieldUpdateOperationsInput | string
    service?: NullableStringFieldUpdateOperationsInput | string | null
    port?: NullableIntFieldUpdateOperationsInput | number | null
    riskScore?: FloatFieldUpdateOperationsInput | number
    status?: EnumScanTacticStatusFieldUpdateOperationsInput | $Enums.ScanTacticStatus
    depth?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    childTactics?: ScanTacticUncheckedUpdateManyWithoutParentTacticNestedInput
    scanFindings?: ScanFindingUncheckedUpdateManyWithoutScanTacticNestedInput
  }

  export type ScanTacticUncheckedUpdateManyWithoutParentTacticInput = {
    id?: StringFieldUpdateOperationsInput | string
    scanRunId?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    layer?: StringFieldUpdateOperationsInput | string
    service?: NullableStringFieldUpdateOperationsInput | string | null
    port?: NullableIntFieldUpdateOperationsInput | number | null
    riskScore?: FloatFieldUpdateOperationsInput | number
    status?: EnumScanTacticStatusFieldUpdateOperationsInput | $Enums.ScanTacticStatus
    depth?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScanFindingUpdateWithoutScanTacticInput = {
    id?: StringFieldUpdateOperationsInput | string
    agentId?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    evidence?: StringFieldUpdateOperationsInput | string
    technique?: StringFieldUpdateOperationsInput | string
    reproduceCommand?: NullableStringFieldUpdateOperationsInput | string | null
    validated?: BoolFieldUpdateOperationsInput | boolean
    validationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    scanRun?: ScanRunUpdateOneRequiredWithoutScanFindingsNestedInput
    routeFindings?: EscalationRouteFindingUpdateManyWithoutScanFindingNestedInput
  }

  export type ScanFindingUncheckedUpdateWithoutScanTacticInput = {
    id?: StringFieldUpdateOperationsInput | string
    scanRunId?: StringFieldUpdateOperationsInput | string
    agentId?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    evidence?: StringFieldUpdateOperationsInput | string
    technique?: StringFieldUpdateOperationsInput | string
    reproduceCommand?: NullableStringFieldUpdateOperationsInput | string | null
    validated?: BoolFieldUpdateOperationsInput | boolean
    validationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    routeFindings?: EscalationRouteFindingUncheckedUpdateManyWithoutScanFindingNestedInput
  }

  export type ScanFindingUncheckedUpdateManyWithoutScanTacticInput = {
    id?: StringFieldUpdateOperationsInput | string
    scanRunId?: StringFieldUpdateOperationsInput | string
    agentId?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    confidence?: FloatFieldUpdateOperationsInput | number
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    evidence?: StringFieldUpdateOperationsInput | string
    technique?: StringFieldUpdateOperationsInput | string
    reproduceCommand?: NullableStringFieldUpdateOperationsInput | string | null
    validated?: BoolFieldUpdateOperationsInput | boolean
    validationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    evidenceRefs?: NullableJsonNullValueInput | InputJsonValue
    sourceToolRuns?: NullableJsonNullValueInput | InputJsonValue
    confidenceReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EscalationRouteFindingCreateManyScanFindingInput = {
    escalationRouteId: string
    ord: number
    linkProbability?: number | null
  }

  export type EscalationRouteFindingUpdateWithoutScanFindingInput = {
    ord?: IntFieldUpdateOperationsInput | number
    linkProbability?: NullableFloatFieldUpdateOperationsInput | number | null
    escalationRoute?: EscalationRouteUpdateOneRequiredWithoutRouteFindingsNestedInput
  }

  export type EscalationRouteFindingUncheckedUpdateWithoutScanFindingInput = {
    escalationRouteId?: StringFieldUpdateOperationsInput | string
    ord?: IntFieldUpdateOperationsInput | number
    linkProbability?: NullableFloatFieldUpdateOperationsInput | number | null
  }

  export type EscalationRouteFindingUncheckedUpdateManyWithoutScanFindingInput = {
    escalationRouteId?: StringFieldUpdateOperationsInput | string
    ord?: IntFieldUpdateOperationsInput | number
    linkProbability?: NullableFloatFieldUpdateOperationsInput | number | null
  }

  export type EscalationRouteFindingCreateManyEscalationRouteInput = {
    scanFindingId: string
    ord: number
    linkProbability?: number | null
  }

  export type EscalationRouteFindingUpdateWithoutEscalationRouteInput = {
    ord?: IntFieldUpdateOperationsInput | number
    linkProbability?: NullableFloatFieldUpdateOperationsInput | number | null
    scanFinding?: ScanFindingUpdateOneRequiredWithoutRouteFindingsNestedInput
  }

  export type EscalationRouteFindingUncheckedUpdateWithoutEscalationRouteInput = {
    scanFindingId?: StringFieldUpdateOperationsInput | string
    ord?: IntFieldUpdateOperationsInput | number
    linkProbability?: NullableFloatFieldUpdateOperationsInput | number | null
  }

  export type EscalationRouteFindingUncheckedUpdateManyWithoutEscalationRouteInput = {
    scanFindingId?: StringFieldUpdateOperationsInput | string
    ord?: IntFieldUpdateOperationsInput | number
    linkProbability?: NullableFloatFieldUpdateOperationsInput | number | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}