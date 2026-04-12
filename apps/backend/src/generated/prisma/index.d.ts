
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
 * Model Workflow
 * 
 */
export type Workflow = $Result.DefaultSelection<Prisma.$WorkflowPayload>

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


export const WorkflowTrigger: {
  manual: 'manual',
  schedule: 'schedule',
  event: 'event'
};

export type WorkflowTrigger = (typeof WorkflowTrigger)[keyof typeof WorkflowTrigger]


export const WorkflowStatus: {
  draft: 'draft',
  active: 'active',
  paused: 'paused'
};

export type WorkflowStatus = (typeof WorkflowStatus)[keyof typeof WorkflowStatus]


export const WorkflowTargetMode: {
  application: 'application',
  runtime: 'runtime',
  manual: 'manual'
};

export type WorkflowTargetMode = (typeof WorkflowTargetMode)[keyof typeof WorkflowTargetMode]

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

export type WorkflowTrigger = $Enums.WorkflowTrigger

export const WorkflowTrigger: typeof $Enums.WorkflowTrigger

export type WorkflowStatus = $Enums.WorkflowStatus

export const WorkflowStatus: typeof $Enums.WorkflowStatus

export type WorkflowTargetMode = $Enums.WorkflowTargetMode

export const WorkflowTargetMode: typeof $Enums.WorkflowTargetMode

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
   * `prisma.workflow`: Exposes CRUD operations for the **Workflow** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Workflows
    * const workflows = await prisma.workflow.findMany()
    * ```
    */
  get workflow(): Prisma.WorkflowDelegate<ExtArgs, ClientOptions>;
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
    Workflow: 'Workflow'
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
      modelProps: "application" | "runtime" | "workflow"
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
      Workflow: {
        payload: Prisma.$WorkflowPayload<ExtArgs>
        fields: Prisma.WorkflowFieldRefs
        operations: {
          findUnique: {
            args: Prisma.WorkflowFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkflowPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.WorkflowFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkflowPayload>
          }
          findFirst: {
            args: Prisma.WorkflowFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkflowPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.WorkflowFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkflowPayload>
          }
          findMany: {
            args: Prisma.WorkflowFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkflowPayload>[]
          }
          create: {
            args: Prisma.WorkflowCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkflowPayload>
          }
          createMany: {
            args: Prisma.WorkflowCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.WorkflowCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkflowPayload>[]
          }
          delete: {
            args: Prisma.WorkflowDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkflowPayload>
          }
          update: {
            args: Prisma.WorkflowUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkflowPayload>
          }
          deleteMany: {
            args: Prisma.WorkflowDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.WorkflowUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.WorkflowUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkflowPayload>[]
          }
          upsert: {
            args: Prisma.WorkflowUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkflowPayload>
          }
          aggregate: {
            args: Prisma.WorkflowAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateWorkflow>
          }
          groupBy: {
            args: Prisma.WorkflowGroupByArgs<ExtArgs>
            result: $Utils.Optional<WorkflowGroupByOutputType>[]
          }
          count: {
            args: Prisma.WorkflowCountArgs<ExtArgs>
            result: $Utils.Optional<WorkflowCountAggregateOutputType> | number
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
    workflow?: WorkflowOmit
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
    workflows: number
  }

  export type ApplicationCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    runtimes?: boolean | ApplicationCountOutputTypeCountRuntimesArgs
    workflows?: boolean | ApplicationCountOutputTypeCountWorkflowsArgs
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
   * ApplicationCountOutputType without action
   */
  export type ApplicationCountOutputTypeCountWorkflowsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WorkflowWhereInput
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
    workflows?: boolean | Application$workflowsArgs<ExtArgs>
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
    workflows?: boolean | Application$workflowsArgs<ExtArgs>
    _count?: boolean | ApplicationCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ApplicationIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type ApplicationIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $ApplicationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Application"
    objects: {
      runtimes: Prisma.$RuntimePayload<ExtArgs>[]
      workflows: Prisma.$WorkflowPayload<ExtArgs>[]
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
    workflows<T extends Application$workflowsArgs<ExtArgs> = {}>(args?: Subset<T, Application$workflowsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WorkflowPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
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
   * Application.workflows
   */
  export type Application$workflowsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workflow
     */
    select?: WorkflowSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workflow
     */
    omit?: WorkflowOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkflowInclude<ExtArgs> | null
    where?: WorkflowWhereInput
    orderBy?: WorkflowOrderByWithRelationInput | WorkflowOrderByWithRelationInput[]
    cursor?: WorkflowWhereUniqueInput
    take?: number
    skip?: number
    distinct?: WorkflowScalarFieldEnum | WorkflowScalarFieldEnum[]
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
   * Model Workflow
   */

  export type AggregateWorkflow = {
    _count: WorkflowCountAggregateOutputType | null
    _avg: WorkflowAvgAggregateOutputType | null
    _sum: WorkflowSumAggregateOutputType | null
    _min: WorkflowMinAggregateOutputType | null
    _max: WorkflowMaxAggregateOutputType | null
  }

  export type WorkflowAvgAggregateOutputType = {
    maxDepth: number | null
  }

  export type WorkflowSumAggregateOutputType = {
    maxDepth: number | null
  }

  export type WorkflowMinAggregateOutputType = {
    id: string | null
    name: string | null
    trigger: $Enums.WorkflowTrigger | null
    status: $Enums.WorkflowStatus | null
    maxDepth: number | null
    targetMode: $Enums.WorkflowTargetMode | null
    applicationId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type WorkflowMaxAggregateOutputType = {
    id: string | null
    name: string | null
    trigger: $Enums.WorkflowTrigger | null
    status: $Enums.WorkflowStatus | null
    maxDepth: number | null
    targetMode: $Enums.WorkflowTargetMode | null
    applicationId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type WorkflowCountAggregateOutputType = {
    id: number
    name: number
    trigger: number
    status: number
    maxDepth: number
    targetMode: number
    applicationId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type WorkflowAvgAggregateInputType = {
    maxDepth?: true
  }

  export type WorkflowSumAggregateInputType = {
    maxDepth?: true
  }

  export type WorkflowMinAggregateInputType = {
    id?: true
    name?: true
    trigger?: true
    status?: true
    maxDepth?: true
    targetMode?: true
    applicationId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type WorkflowMaxAggregateInputType = {
    id?: true
    name?: true
    trigger?: true
    status?: true
    maxDepth?: true
    targetMode?: true
    applicationId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type WorkflowCountAggregateInputType = {
    id?: true
    name?: true
    trigger?: true
    status?: true
    maxDepth?: true
    targetMode?: true
    applicationId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type WorkflowAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Workflow to aggregate.
     */
    where?: WorkflowWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Workflows to fetch.
     */
    orderBy?: WorkflowOrderByWithRelationInput | WorkflowOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: WorkflowWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Workflows from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Workflows.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Workflows
    **/
    _count?: true | WorkflowCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: WorkflowAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: WorkflowSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: WorkflowMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: WorkflowMaxAggregateInputType
  }

  export type GetWorkflowAggregateType<T extends WorkflowAggregateArgs> = {
        [P in keyof T & keyof AggregateWorkflow]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateWorkflow[P]>
      : GetScalarType<T[P], AggregateWorkflow[P]>
  }




  export type WorkflowGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WorkflowWhereInput
    orderBy?: WorkflowOrderByWithAggregationInput | WorkflowOrderByWithAggregationInput[]
    by: WorkflowScalarFieldEnum[] | WorkflowScalarFieldEnum
    having?: WorkflowScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: WorkflowCountAggregateInputType | true
    _avg?: WorkflowAvgAggregateInputType
    _sum?: WorkflowSumAggregateInputType
    _min?: WorkflowMinAggregateInputType
    _max?: WorkflowMaxAggregateInputType
  }

  export type WorkflowGroupByOutputType = {
    id: string
    name: string
    trigger: $Enums.WorkflowTrigger
    status: $Enums.WorkflowStatus
    maxDepth: number
    targetMode: $Enums.WorkflowTargetMode
    applicationId: string | null
    createdAt: Date
    updatedAt: Date
    _count: WorkflowCountAggregateOutputType | null
    _avg: WorkflowAvgAggregateOutputType | null
    _sum: WorkflowSumAggregateOutputType | null
    _min: WorkflowMinAggregateOutputType | null
    _max: WorkflowMaxAggregateOutputType | null
  }

  type GetWorkflowGroupByPayload<T extends WorkflowGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<WorkflowGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof WorkflowGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], WorkflowGroupByOutputType[P]>
            : GetScalarType<T[P], WorkflowGroupByOutputType[P]>
        }
      >
    >


  export type WorkflowSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    trigger?: boolean
    status?: boolean
    maxDepth?: boolean
    targetMode?: boolean
    applicationId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    application?: boolean | Workflow$applicationArgs<ExtArgs>
  }, ExtArgs["result"]["workflow"]>

  export type WorkflowSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    trigger?: boolean
    status?: boolean
    maxDepth?: boolean
    targetMode?: boolean
    applicationId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    application?: boolean | Workflow$applicationArgs<ExtArgs>
  }, ExtArgs["result"]["workflow"]>

  export type WorkflowSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    trigger?: boolean
    status?: boolean
    maxDepth?: boolean
    targetMode?: boolean
    applicationId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    application?: boolean | Workflow$applicationArgs<ExtArgs>
  }, ExtArgs["result"]["workflow"]>

  export type WorkflowSelectScalar = {
    id?: boolean
    name?: boolean
    trigger?: boolean
    status?: boolean
    maxDepth?: boolean
    targetMode?: boolean
    applicationId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type WorkflowOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "trigger" | "status" | "maxDepth" | "targetMode" | "applicationId" | "createdAt" | "updatedAt", ExtArgs["result"]["workflow"]>
  export type WorkflowInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    application?: boolean | Workflow$applicationArgs<ExtArgs>
  }
  export type WorkflowIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    application?: boolean | Workflow$applicationArgs<ExtArgs>
  }
  export type WorkflowIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    application?: boolean | Workflow$applicationArgs<ExtArgs>
  }

  export type $WorkflowPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Workflow"
    objects: {
      application: Prisma.$ApplicationPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      trigger: $Enums.WorkflowTrigger
      status: $Enums.WorkflowStatus
      maxDepth: number
      targetMode: $Enums.WorkflowTargetMode
      applicationId: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["workflow"]>
    composites: {}
  }

  type WorkflowGetPayload<S extends boolean | null | undefined | WorkflowDefaultArgs> = $Result.GetResult<Prisma.$WorkflowPayload, S>

  type WorkflowCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<WorkflowFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: WorkflowCountAggregateInputType | true
    }

  export interface WorkflowDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Workflow'], meta: { name: 'Workflow' } }
    /**
     * Find zero or one Workflow that matches the filter.
     * @param {WorkflowFindUniqueArgs} args - Arguments to find a Workflow
     * @example
     * // Get one Workflow
     * const workflow = await prisma.workflow.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends WorkflowFindUniqueArgs>(args: SelectSubset<T, WorkflowFindUniqueArgs<ExtArgs>>): Prisma__WorkflowClient<$Result.GetResult<Prisma.$WorkflowPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Workflow that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {WorkflowFindUniqueOrThrowArgs} args - Arguments to find a Workflow
     * @example
     * // Get one Workflow
     * const workflow = await prisma.workflow.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends WorkflowFindUniqueOrThrowArgs>(args: SelectSubset<T, WorkflowFindUniqueOrThrowArgs<ExtArgs>>): Prisma__WorkflowClient<$Result.GetResult<Prisma.$WorkflowPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Workflow that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkflowFindFirstArgs} args - Arguments to find a Workflow
     * @example
     * // Get one Workflow
     * const workflow = await prisma.workflow.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends WorkflowFindFirstArgs>(args?: SelectSubset<T, WorkflowFindFirstArgs<ExtArgs>>): Prisma__WorkflowClient<$Result.GetResult<Prisma.$WorkflowPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Workflow that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkflowFindFirstOrThrowArgs} args - Arguments to find a Workflow
     * @example
     * // Get one Workflow
     * const workflow = await prisma.workflow.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends WorkflowFindFirstOrThrowArgs>(args?: SelectSubset<T, WorkflowFindFirstOrThrowArgs<ExtArgs>>): Prisma__WorkflowClient<$Result.GetResult<Prisma.$WorkflowPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Workflows that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkflowFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Workflows
     * const workflows = await prisma.workflow.findMany()
     * 
     * // Get first 10 Workflows
     * const workflows = await prisma.workflow.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const workflowWithIdOnly = await prisma.workflow.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends WorkflowFindManyArgs>(args?: SelectSubset<T, WorkflowFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WorkflowPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Workflow.
     * @param {WorkflowCreateArgs} args - Arguments to create a Workflow.
     * @example
     * // Create one Workflow
     * const Workflow = await prisma.workflow.create({
     *   data: {
     *     // ... data to create a Workflow
     *   }
     * })
     * 
     */
    create<T extends WorkflowCreateArgs>(args: SelectSubset<T, WorkflowCreateArgs<ExtArgs>>): Prisma__WorkflowClient<$Result.GetResult<Prisma.$WorkflowPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Workflows.
     * @param {WorkflowCreateManyArgs} args - Arguments to create many Workflows.
     * @example
     * // Create many Workflows
     * const workflow = await prisma.workflow.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends WorkflowCreateManyArgs>(args?: SelectSubset<T, WorkflowCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Workflows and returns the data saved in the database.
     * @param {WorkflowCreateManyAndReturnArgs} args - Arguments to create many Workflows.
     * @example
     * // Create many Workflows
     * const workflow = await prisma.workflow.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Workflows and only return the `id`
     * const workflowWithIdOnly = await prisma.workflow.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends WorkflowCreateManyAndReturnArgs>(args?: SelectSubset<T, WorkflowCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WorkflowPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Workflow.
     * @param {WorkflowDeleteArgs} args - Arguments to delete one Workflow.
     * @example
     * // Delete one Workflow
     * const Workflow = await prisma.workflow.delete({
     *   where: {
     *     // ... filter to delete one Workflow
     *   }
     * })
     * 
     */
    delete<T extends WorkflowDeleteArgs>(args: SelectSubset<T, WorkflowDeleteArgs<ExtArgs>>): Prisma__WorkflowClient<$Result.GetResult<Prisma.$WorkflowPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Workflow.
     * @param {WorkflowUpdateArgs} args - Arguments to update one Workflow.
     * @example
     * // Update one Workflow
     * const workflow = await prisma.workflow.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends WorkflowUpdateArgs>(args: SelectSubset<T, WorkflowUpdateArgs<ExtArgs>>): Prisma__WorkflowClient<$Result.GetResult<Prisma.$WorkflowPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Workflows.
     * @param {WorkflowDeleteManyArgs} args - Arguments to filter Workflows to delete.
     * @example
     * // Delete a few Workflows
     * const { count } = await prisma.workflow.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends WorkflowDeleteManyArgs>(args?: SelectSubset<T, WorkflowDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Workflows.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkflowUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Workflows
     * const workflow = await prisma.workflow.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends WorkflowUpdateManyArgs>(args: SelectSubset<T, WorkflowUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Workflows and returns the data updated in the database.
     * @param {WorkflowUpdateManyAndReturnArgs} args - Arguments to update many Workflows.
     * @example
     * // Update many Workflows
     * const workflow = await prisma.workflow.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Workflows and only return the `id`
     * const workflowWithIdOnly = await prisma.workflow.updateManyAndReturn({
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
    updateManyAndReturn<T extends WorkflowUpdateManyAndReturnArgs>(args: SelectSubset<T, WorkflowUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WorkflowPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Workflow.
     * @param {WorkflowUpsertArgs} args - Arguments to update or create a Workflow.
     * @example
     * // Update or create a Workflow
     * const workflow = await prisma.workflow.upsert({
     *   create: {
     *     // ... data to create a Workflow
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Workflow we want to update
     *   }
     * })
     */
    upsert<T extends WorkflowUpsertArgs>(args: SelectSubset<T, WorkflowUpsertArgs<ExtArgs>>): Prisma__WorkflowClient<$Result.GetResult<Prisma.$WorkflowPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Workflows.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkflowCountArgs} args - Arguments to filter Workflows to count.
     * @example
     * // Count the number of Workflows
     * const count = await prisma.workflow.count({
     *   where: {
     *     // ... the filter for the Workflows we want to count
     *   }
     * })
    **/
    count<T extends WorkflowCountArgs>(
      args?: Subset<T, WorkflowCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], WorkflowCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Workflow.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkflowAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends WorkflowAggregateArgs>(args: Subset<T, WorkflowAggregateArgs>): Prisma.PrismaPromise<GetWorkflowAggregateType<T>>

    /**
     * Group by Workflow.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkflowGroupByArgs} args - Group by arguments.
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
      T extends WorkflowGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: WorkflowGroupByArgs['orderBy'] }
        : { orderBy?: WorkflowGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, WorkflowGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetWorkflowGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Workflow model
   */
  readonly fields: WorkflowFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Workflow.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__WorkflowClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    application<T extends Workflow$applicationArgs<ExtArgs> = {}>(args?: Subset<T, Workflow$applicationArgs<ExtArgs>>): Prisma__ApplicationClient<$Result.GetResult<Prisma.$ApplicationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
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
   * Fields of the Workflow model
   */
  interface WorkflowFieldRefs {
    readonly id: FieldRef<"Workflow", 'String'>
    readonly name: FieldRef<"Workflow", 'String'>
    readonly trigger: FieldRef<"Workflow", 'WorkflowTrigger'>
    readonly status: FieldRef<"Workflow", 'WorkflowStatus'>
    readonly maxDepth: FieldRef<"Workflow", 'Int'>
    readonly targetMode: FieldRef<"Workflow", 'WorkflowTargetMode'>
    readonly applicationId: FieldRef<"Workflow", 'String'>
    readonly createdAt: FieldRef<"Workflow", 'DateTime'>
    readonly updatedAt: FieldRef<"Workflow", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Workflow findUnique
   */
  export type WorkflowFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workflow
     */
    select?: WorkflowSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workflow
     */
    omit?: WorkflowOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkflowInclude<ExtArgs> | null
    /**
     * Filter, which Workflow to fetch.
     */
    where: WorkflowWhereUniqueInput
  }

  /**
   * Workflow findUniqueOrThrow
   */
  export type WorkflowFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workflow
     */
    select?: WorkflowSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workflow
     */
    omit?: WorkflowOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkflowInclude<ExtArgs> | null
    /**
     * Filter, which Workflow to fetch.
     */
    where: WorkflowWhereUniqueInput
  }

  /**
   * Workflow findFirst
   */
  export type WorkflowFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workflow
     */
    select?: WorkflowSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workflow
     */
    omit?: WorkflowOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkflowInclude<ExtArgs> | null
    /**
     * Filter, which Workflow to fetch.
     */
    where?: WorkflowWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Workflows to fetch.
     */
    orderBy?: WorkflowOrderByWithRelationInput | WorkflowOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Workflows.
     */
    cursor?: WorkflowWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Workflows from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Workflows.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Workflows.
     */
    distinct?: WorkflowScalarFieldEnum | WorkflowScalarFieldEnum[]
  }

  /**
   * Workflow findFirstOrThrow
   */
  export type WorkflowFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workflow
     */
    select?: WorkflowSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workflow
     */
    omit?: WorkflowOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkflowInclude<ExtArgs> | null
    /**
     * Filter, which Workflow to fetch.
     */
    where?: WorkflowWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Workflows to fetch.
     */
    orderBy?: WorkflowOrderByWithRelationInput | WorkflowOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Workflows.
     */
    cursor?: WorkflowWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Workflows from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Workflows.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Workflows.
     */
    distinct?: WorkflowScalarFieldEnum | WorkflowScalarFieldEnum[]
  }

  /**
   * Workflow findMany
   */
  export type WorkflowFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workflow
     */
    select?: WorkflowSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workflow
     */
    omit?: WorkflowOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkflowInclude<ExtArgs> | null
    /**
     * Filter, which Workflows to fetch.
     */
    where?: WorkflowWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Workflows to fetch.
     */
    orderBy?: WorkflowOrderByWithRelationInput | WorkflowOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Workflows.
     */
    cursor?: WorkflowWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Workflows from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Workflows.
     */
    skip?: number
    distinct?: WorkflowScalarFieldEnum | WorkflowScalarFieldEnum[]
  }

  /**
   * Workflow create
   */
  export type WorkflowCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workflow
     */
    select?: WorkflowSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workflow
     */
    omit?: WorkflowOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkflowInclude<ExtArgs> | null
    /**
     * The data needed to create a Workflow.
     */
    data: XOR<WorkflowCreateInput, WorkflowUncheckedCreateInput>
  }

  /**
   * Workflow createMany
   */
  export type WorkflowCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Workflows.
     */
    data: WorkflowCreateManyInput | WorkflowCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Workflow createManyAndReturn
   */
  export type WorkflowCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workflow
     */
    select?: WorkflowSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Workflow
     */
    omit?: WorkflowOmit<ExtArgs> | null
    /**
     * The data used to create many Workflows.
     */
    data: WorkflowCreateManyInput | WorkflowCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkflowIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Workflow update
   */
  export type WorkflowUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workflow
     */
    select?: WorkflowSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workflow
     */
    omit?: WorkflowOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkflowInclude<ExtArgs> | null
    /**
     * The data needed to update a Workflow.
     */
    data: XOR<WorkflowUpdateInput, WorkflowUncheckedUpdateInput>
    /**
     * Choose, which Workflow to update.
     */
    where: WorkflowWhereUniqueInput
  }

  /**
   * Workflow updateMany
   */
  export type WorkflowUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Workflows.
     */
    data: XOR<WorkflowUpdateManyMutationInput, WorkflowUncheckedUpdateManyInput>
    /**
     * Filter which Workflows to update
     */
    where?: WorkflowWhereInput
    /**
     * Limit how many Workflows to update.
     */
    limit?: number
  }

  /**
   * Workflow updateManyAndReturn
   */
  export type WorkflowUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workflow
     */
    select?: WorkflowSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Workflow
     */
    omit?: WorkflowOmit<ExtArgs> | null
    /**
     * The data used to update Workflows.
     */
    data: XOR<WorkflowUpdateManyMutationInput, WorkflowUncheckedUpdateManyInput>
    /**
     * Filter which Workflows to update
     */
    where?: WorkflowWhereInput
    /**
     * Limit how many Workflows to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkflowIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Workflow upsert
   */
  export type WorkflowUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workflow
     */
    select?: WorkflowSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workflow
     */
    omit?: WorkflowOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkflowInclude<ExtArgs> | null
    /**
     * The filter to search for the Workflow to update in case it exists.
     */
    where: WorkflowWhereUniqueInput
    /**
     * In case the Workflow found by the `where` argument doesn't exist, create a new Workflow with this data.
     */
    create: XOR<WorkflowCreateInput, WorkflowUncheckedCreateInput>
    /**
     * In case the Workflow was found with the provided `where` argument, update it with this data.
     */
    update: XOR<WorkflowUpdateInput, WorkflowUncheckedUpdateInput>
  }

  /**
   * Workflow delete
   */
  export type WorkflowDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workflow
     */
    select?: WorkflowSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workflow
     */
    omit?: WorkflowOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkflowInclude<ExtArgs> | null
    /**
     * Filter which Workflow to delete.
     */
    where: WorkflowWhereUniqueInput
  }

  /**
   * Workflow deleteMany
   */
  export type WorkflowDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Workflows to delete
     */
    where?: WorkflowWhereInput
    /**
     * Limit how many Workflows to delete.
     */
    limit?: number
  }

  /**
   * Workflow.application
   */
  export type Workflow$applicationArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
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
   * Workflow without action
   */
  export type WorkflowDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workflow
     */
    select?: WorkflowSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workflow
     */
    omit?: WorkflowOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkflowInclude<ExtArgs> | null
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


  export const WorkflowScalarFieldEnum: {
    id: 'id',
    name: 'name',
    trigger: 'trigger',
    status: 'status',
    maxDepth: 'maxDepth',
    targetMode: 'targetMode',
    applicationId: 'applicationId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type WorkflowScalarFieldEnum = (typeof WorkflowScalarFieldEnum)[keyof typeof WorkflowScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


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
   * Reference to a field of type 'WorkflowTrigger'
   */
  export type EnumWorkflowTriggerFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'WorkflowTrigger'>
    


  /**
   * Reference to a field of type 'WorkflowTrigger[]'
   */
  export type ListEnumWorkflowTriggerFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'WorkflowTrigger[]'>
    


  /**
   * Reference to a field of type 'WorkflowStatus'
   */
  export type EnumWorkflowStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'WorkflowStatus'>
    


  /**
   * Reference to a field of type 'WorkflowStatus[]'
   */
  export type ListEnumWorkflowStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'WorkflowStatus[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'WorkflowTargetMode'
   */
  export type EnumWorkflowTargetModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'WorkflowTargetMode'>
    


  /**
   * Reference to a field of type 'WorkflowTargetMode[]'
   */
  export type ListEnumWorkflowTargetModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'WorkflowTargetMode[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
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
    workflows?: WorkflowListRelationFilter
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
    workflows?: WorkflowOrderByRelationAggregateInput
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
    workflows?: WorkflowListRelationFilter
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

  export type WorkflowWhereInput = {
    AND?: WorkflowWhereInput | WorkflowWhereInput[]
    OR?: WorkflowWhereInput[]
    NOT?: WorkflowWhereInput | WorkflowWhereInput[]
    id?: UuidFilter<"Workflow"> | string
    name?: StringFilter<"Workflow"> | string
    trigger?: EnumWorkflowTriggerFilter<"Workflow"> | $Enums.WorkflowTrigger
    status?: EnumWorkflowStatusFilter<"Workflow"> | $Enums.WorkflowStatus
    maxDepth?: IntFilter<"Workflow"> | number
    targetMode?: EnumWorkflowTargetModeFilter<"Workflow"> | $Enums.WorkflowTargetMode
    applicationId?: UuidNullableFilter<"Workflow"> | string | null
    createdAt?: DateTimeFilter<"Workflow"> | Date | string
    updatedAt?: DateTimeFilter<"Workflow"> | Date | string
    application?: XOR<ApplicationNullableScalarRelationFilter, ApplicationWhereInput> | null
  }

  export type WorkflowOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    trigger?: SortOrder
    status?: SortOrder
    maxDepth?: SortOrder
    targetMode?: SortOrder
    applicationId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    application?: ApplicationOrderByWithRelationInput
  }

  export type WorkflowWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: WorkflowWhereInput | WorkflowWhereInput[]
    OR?: WorkflowWhereInput[]
    NOT?: WorkflowWhereInput | WorkflowWhereInput[]
    name?: StringFilter<"Workflow"> | string
    trigger?: EnumWorkflowTriggerFilter<"Workflow"> | $Enums.WorkflowTrigger
    status?: EnumWorkflowStatusFilter<"Workflow"> | $Enums.WorkflowStatus
    maxDepth?: IntFilter<"Workflow"> | number
    targetMode?: EnumWorkflowTargetModeFilter<"Workflow"> | $Enums.WorkflowTargetMode
    applicationId?: UuidNullableFilter<"Workflow"> | string | null
    createdAt?: DateTimeFilter<"Workflow"> | Date | string
    updatedAt?: DateTimeFilter<"Workflow"> | Date | string
    application?: XOR<ApplicationNullableScalarRelationFilter, ApplicationWhereInput> | null
  }, "id">

  export type WorkflowOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    trigger?: SortOrder
    status?: SortOrder
    maxDepth?: SortOrder
    targetMode?: SortOrder
    applicationId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: WorkflowCountOrderByAggregateInput
    _avg?: WorkflowAvgOrderByAggregateInput
    _max?: WorkflowMaxOrderByAggregateInput
    _min?: WorkflowMinOrderByAggregateInput
    _sum?: WorkflowSumOrderByAggregateInput
  }

  export type WorkflowScalarWhereWithAggregatesInput = {
    AND?: WorkflowScalarWhereWithAggregatesInput | WorkflowScalarWhereWithAggregatesInput[]
    OR?: WorkflowScalarWhereWithAggregatesInput[]
    NOT?: WorkflowScalarWhereWithAggregatesInput | WorkflowScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"Workflow"> | string
    name?: StringWithAggregatesFilter<"Workflow"> | string
    trigger?: EnumWorkflowTriggerWithAggregatesFilter<"Workflow"> | $Enums.WorkflowTrigger
    status?: EnumWorkflowStatusWithAggregatesFilter<"Workflow"> | $Enums.WorkflowStatus
    maxDepth?: IntWithAggregatesFilter<"Workflow"> | number
    targetMode?: EnumWorkflowTargetModeWithAggregatesFilter<"Workflow"> | $Enums.WorkflowTargetMode
    applicationId?: UuidNullableWithAggregatesFilter<"Workflow"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Workflow"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Workflow"> | Date | string
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
    workflows?: WorkflowCreateNestedManyWithoutApplicationInput
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
    workflows?: WorkflowUncheckedCreateNestedManyWithoutApplicationInput
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
    workflows?: WorkflowUpdateManyWithoutApplicationNestedInput
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
    workflows?: WorkflowUncheckedUpdateManyWithoutApplicationNestedInput
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

  export type WorkflowCreateInput = {
    id: string
    name: string
    trigger: $Enums.WorkflowTrigger
    status: $Enums.WorkflowStatus
    maxDepth: number
    targetMode: $Enums.WorkflowTargetMode
    createdAt?: Date | string
    updatedAt?: Date | string
    application?: ApplicationCreateNestedOneWithoutWorkflowsInput
  }

  export type WorkflowUncheckedCreateInput = {
    id: string
    name: string
    trigger: $Enums.WorkflowTrigger
    status: $Enums.WorkflowStatus
    maxDepth: number
    targetMode: $Enums.WorkflowTargetMode
    applicationId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type WorkflowUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trigger?: EnumWorkflowTriggerFieldUpdateOperationsInput | $Enums.WorkflowTrigger
    status?: EnumWorkflowStatusFieldUpdateOperationsInput | $Enums.WorkflowStatus
    maxDepth?: IntFieldUpdateOperationsInput | number
    targetMode?: EnumWorkflowTargetModeFieldUpdateOperationsInput | $Enums.WorkflowTargetMode
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    application?: ApplicationUpdateOneWithoutWorkflowsNestedInput
  }

  export type WorkflowUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trigger?: EnumWorkflowTriggerFieldUpdateOperationsInput | $Enums.WorkflowTrigger
    status?: EnumWorkflowStatusFieldUpdateOperationsInput | $Enums.WorkflowStatus
    maxDepth?: IntFieldUpdateOperationsInput | number
    targetMode?: EnumWorkflowTargetModeFieldUpdateOperationsInput | $Enums.WorkflowTargetMode
    applicationId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WorkflowCreateManyInput = {
    id: string
    name: string
    trigger: $Enums.WorkflowTrigger
    status: $Enums.WorkflowStatus
    maxDepth: number
    targetMode: $Enums.WorkflowTargetMode
    applicationId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type WorkflowUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trigger?: EnumWorkflowTriggerFieldUpdateOperationsInput | $Enums.WorkflowTrigger
    status?: EnumWorkflowStatusFieldUpdateOperationsInput | $Enums.WorkflowStatus
    maxDepth?: IntFieldUpdateOperationsInput | number
    targetMode?: EnumWorkflowTargetModeFieldUpdateOperationsInput | $Enums.WorkflowTargetMode
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WorkflowUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trigger?: EnumWorkflowTriggerFieldUpdateOperationsInput | $Enums.WorkflowTrigger
    status?: EnumWorkflowStatusFieldUpdateOperationsInput | $Enums.WorkflowStatus
    maxDepth?: IntFieldUpdateOperationsInput | number
    targetMode?: EnumWorkflowTargetModeFieldUpdateOperationsInput | $Enums.WorkflowTargetMode
    applicationId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
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

  export type WorkflowListRelationFilter = {
    every?: WorkflowWhereInput
    some?: WorkflowWhereInput
    none?: WorkflowWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type RuntimeOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type WorkflowOrderByRelationAggregateInput = {
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

  export type EnumWorkflowTriggerFilter<$PrismaModel = never> = {
    equals?: $Enums.WorkflowTrigger | EnumWorkflowTriggerFieldRefInput<$PrismaModel>
    in?: $Enums.WorkflowTrigger[] | ListEnumWorkflowTriggerFieldRefInput<$PrismaModel>
    notIn?: $Enums.WorkflowTrigger[] | ListEnumWorkflowTriggerFieldRefInput<$PrismaModel>
    not?: NestedEnumWorkflowTriggerFilter<$PrismaModel> | $Enums.WorkflowTrigger
  }

  export type EnumWorkflowStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.WorkflowStatus | EnumWorkflowStatusFieldRefInput<$PrismaModel>
    in?: $Enums.WorkflowStatus[] | ListEnumWorkflowStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.WorkflowStatus[] | ListEnumWorkflowStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumWorkflowStatusFilter<$PrismaModel> | $Enums.WorkflowStatus
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

  export type EnumWorkflowTargetModeFilter<$PrismaModel = never> = {
    equals?: $Enums.WorkflowTargetMode | EnumWorkflowTargetModeFieldRefInput<$PrismaModel>
    in?: $Enums.WorkflowTargetMode[] | ListEnumWorkflowTargetModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.WorkflowTargetMode[] | ListEnumWorkflowTargetModeFieldRefInput<$PrismaModel>
    not?: NestedEnumWorkflowTargetModeFilter<$PrismaModel> | $Enums.WorkflowTargetMode
  }

  export type WorkflowCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    trigger?: SortOrder
    status?: SortOrder
    maxDepth?: SortOrder
    targetMode?: SortOrder
    applicationId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WorkflowAvgOrderByAggregateInput = {
    maxDepth?: SortOrder
  }

  export type WorkflowMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    trigger?: SortOrder
    status?: SortOrder
    maxDepth?: SortOrder
    targetMode?: SortOrder
    applicationId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WorkflowMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    trigger?: SortOrder
    status?: SortOrder
    maxDepth?: SortOrder
    targetMode?: SortOrder
    applicationId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WorkflowSumOrderByAggregateInput = {
    maxDepth?: SortOrder
  }

  export type EnumWorkflowTriggerWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.WorkflowTrigger | EnumWorkflowTriggerFieldRefInput<$PrismaModel>
    in?: $Enums.WorkflowTrigger[] | ListEnumWorkflowTriggerFieldRefInput<$PrismaModel>
    notIn?: $Enums.WorkflowTrigger[] | ListEnumWorkflowTriggerFieldRefInput<$PrismaModel>
    not?: NestedEnumWorkflowTriggerWithAggregatesFilter<$PrismaModel> | $Enums.WorkflowTrigger
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumWorkflowTriggerFilter<$PrismaModel>
    _max?: NestedEnumWorkflowTriggerFilter<$PrismaModel>
  }

  export type EnumWorkflowStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.WorkflowStatus | EnumWorkflowStatusFieldRefInput<$PrismaModel>
    in?: $Enums.WorkflowStatus[] | ListEnumWorkflowStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.WorkflowStatus[] | ListEnumWorkflowStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumWorkflowStatusWithAggregatesFilter<$PrismaModel> | $Enums.WorkflowStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumWorkflowStatusFilter<$PrismaModel>
    _max?: NestedEnumWorkflowStatusFilter<$PrismaModel>
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

  export type EnumWorkflowTargetModeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.WorkflowTargetMode | EnumWorkflowTargetModeFieldRefInput<$PrismaModel>
    in?: $Enums.WorkflowTargetMode[] | ListEnumWorkflowTargetModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.WorkflowTargetMode[] | ListEnumWorkflowTargetModeFieldRefInput<$PrismaModel>
    not?: NestedEnumWorkflowTargetModeWithAggregatesFilter<$PrismaModel> | $Enums.WorkflowTargetMode
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumWorkflowTargetModeFilter<$PrismaModel>
    _max?: NestedEnumWorkflowTargetModeFilter<$PrismaModel>
  }

  export type RuntimeCreateNestedManyWithoutApplicationInput = {
    create?: XOR<RuntimeCreateWithoutApplicationInput, RuntimeUncheckedCreateWithoutApplicationInput> | RuntimeCreateWithoutApplicationInput[] | RuntimeUncheckedCreateWithoutApplicationInput[]
    connectOrCreate?: RuntimeCreateOrConnectWithoutApplicationInput | RuntimeCreateOrConnectWithoutApplicationInput[]
    createMany?: RuntimeCreateManyApplicationInputEnvelope
    connect?: RuntimeWhereUniqueInput | RuntimeWhereUniqueInput[]
  }

  export type WorkflowCreateNestedManyWithoutApplicationInput = {
    create?: XOR<WorkflowCreateWithoutApplicationInput, WorkflowUncheckedCreateWithoutApplicationInput> | WorkflowCreateWithoutApplicationInput[] | WorkflowUncheckedCreateWithoutApplicationInput[]
    connectOrCreate?: WorkflowCreateOrConnectWithoutApplicationInput | WorkflowCreateOrConnectWithoutApplicationInput[]
    createMany?: WorkflowCreateManyApplicationInputEnvelope
    connect?: WorkflowWhereUniqueInput | WorkflowWhereUniqueInput[]
  }

  export type RuntimeUncheckedCreateNestedManyWithoutApplicationInput = {
    create?: XOR<RuntimeCreateWithoutApplicationInput, RuntimeUncheckedCreateWithoutApplicationInput> | RuntimeCreateWithoutApplicationInput[] | RuntimeUncheckedCreateWithoutApplicationInput[]
    connectOrCreate?: RuntimeCreateOrConnectWithoutApplicationInput | RuntimeCreateOrConnectWithoutApplicationInput[]
    createMany?: RuntimeCreateManyApplicationInputEnvelope
    connect?: RuntimeWhereUniqueInput | RuntimeWhereUniqueInput[]
  }

  export type WorkflowUncheckedCreateNestedManyWithoutApplicationInput = {
    create?: XOR<WorkflowCreateWithoutApplicationInput, WorkflowUncheckedCreateWithoutApplicationInput> | WorkflowCreateWithoutApplicationInput[] | WorkflowUncheckedCreateWithoutApplicationInput[]
    connectOrCreate?: WorkflowCreateOrConnectWithoutApplicationInput | WorkflowCreateOrConnectWithoutApplicationInput[]
    createMany?: WorkflowCreateManyApplicationInputEnvelope
    connect?: WorkflowWhereUniqueInput | WorkflowWhereUniqueInput[]
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

  export type WorkflowUpdateManyWithoutApplicationNestedInput = {
    create?: XOR<WorkflowCreateWithoutApplicationInput, WorkflowUncheckedCreateWithoutApplicationInput> | WorkflowCreateWithoutApplicationInput[] | WorkflowUncheckedCreateWithoutApplicationInput[]
    connectOrCreate?: WorkflowCreateOrConnectWithoutApplicationInput | WorkflowCreateOrConnectWithoutApplicationInput[]
    upsert?: WorkflowUpsertWithWhereUniqueWithoutApplicationInput | WorkflowUpsertWithWhereUniqueWithoutApplicationInput[]
    createMany?: WorkflowCreateManyApplicationInputEnvelope
    set?: WorkflowWhereUniqueInput | WorkflowWhereUniqueInput[]
    disconnect?: WorkflowWhereUniqueInput | WorkflowWhereUniqueInput[]
    delete?: WorkflowWhereUniqueInput | WorkflowWhereUniqueInput[]
    connect?: WorkflowWhereUniqueInput | WorkflowWhereUniqueInput[]
    update?: WorkflowUpdateWithWhereUniqueWithoutApplicationInput | WorkflowUpdateWithWhereUniqueWithoutApplicationInput[]
    updateMany?: WorkflowUpdateManyWithWhereWithoutApplicationInput | WorkflowUpdateManyWithWhereWithoutApplicationInput[]
    deleteMany?: WorkflowScalarWhereInput | WorkflowScalarWhereInput[]
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

  export type WorkflowUncheckedUpdateManyWithoutApplicationNestedInput = {
    create?: XOR<WorkflowCreateWithoutApplicationInput, WorkflowUncheckedCreateWithoutApplicationInput> | WorkflowCreateWithoutApplicationInput[] | WorkflowUncheckedCreateWithoutApplicationInput[]
    connectOrCreate?: WorkflowCreateOrConnectWithoutApplicationInput | WorkflowCreateOrConnectWithoutApplicationInput[]
    upsert?: WorkflowUpsertWithWhereUniqueWithoutApplicationInput | WorkflowUpsertWithWhereUniqueWithoutApplicationInput[]
    createMany?: WorkflowCreateManyApplicationInputEnvelope
    set?: WorkflowWhereUniqueInput | WorkflowWhereUniqueInput[]
    disconnect?: WorkflowWhereUniqueInput | WorkflowWhereUniqueInput[]
    delete?: WorkflowWhereUniqueInput | WorkflowWhereUniqueInput[]
    connect?: WorkflowWhereUniqueInput | WorkflowWhereUniqueInput[]
    update?: WorkflowUpdateWithWhereUniqueWithoutApplicationInput | WorkflowUpdateWithWhereUniqueWithoutApplicationInput[]
    updateMany?: WorkflowUpdateManyWithWhereWithoutApplicationInput | WorkflowUpdateManyWithWhereWithoutApplicationInput[]
    deleteMany?: WorkflowScalarWhereInput | WorkflowScalarWhereInput[]
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

  export type ApplicationCreateNestedOneWithoutWorkflowsInput = {
    create?: XOR<ApplicationCreateWithoutWorkflowsInput, ApplicationUncheckedCreateWithoutWorkflowsInput>
    connectOrCreate?: ApplicationCreateOrConnectWithoutWorkflowsInput
    connect?: ApplicationWhereUniqueInput
  }

  export type EnumWorkflowTriggerFieldUpdateOperationsInput = {
    set?: $Enums.WorkflowTrigger
  }

  export type EnumWorkflowStatusFieldUpdateOperationsInput = {
    set?: $Enums.WorkflowStatus
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type EnumWorkflowTargetModeFieldUpdateOperationsInput = {
    set?: $Enums.WorkflowTargetMode
  }

  export type ApplicationUpdateOneWithoutWorkflowsNestedInput = {
    create?: XOR<ApplicationCreateWithoutWorkflowsInput, ApplicationUncheckedCreateWithoutWorkflowsInput>
    connectOrCreate?: ApplicationCreateOrConnectWithoutWorkflowsInput
    upsert?: ApplicationUpsertWithoutWorkflowsInput
    disconnect?: ApplicationWhereInput | boolean
    delete?: ApplicationWhereInput | boolean
    connect?: ApplicationWhereUniqueInput
    update?: XOR<XOR<ApplicationUpdateToOneWithWhereWithoutWorkflowsInput, ApplicationUpdateWithoutWorkflowsInput>, ApplicationUncheckedUpdateWithoutWorkflowsInput>
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

  export type NestedEnumWorkflowTriggerFilter<$PrismaModel = never> = {
    equals?: $Enums.WorkflowTrigger | EnumWorkflowTriggerFieldRefInput<$PrismaModel>
    in?: $Enums.WorkflowTrigger[] | ListEnumWorkflowTriggerFieldRefInput<$PrismaModel>
    notIn?: $Enums.WorkflowTrigger[] | ListEnumWorkflowTriggerFieldRefInput<$PrismaModel>
    not?: NestedEnumWorkflowTriggerFilter<$PrismaModel> | $Enums.WorkflowTrigger
  }

  export type NestedEnumWorkflowStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.WorkflowStatus | EnumWorkflowStatusFieldRefInput<$PrismaModel>
    in?: $Enums.WorkflowStatus[] | ListEnumWorkflowStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.WorkflowStatus[] | ListEnumWorkflowStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumWorkflowStatusFilter<$PrismaModel> | $Enums.WorkflowStatus
  }

  export type NestedEnumWorkflowTargetModeFilter<$PrismaModel = never> = {
    equals?: $Enums.WorkflowTargetMode | EnumWorkflowTargetModeFieldRefInput<$PrismaModel>
    in?: $Enums.WorkflowTargetMode[] | ListEnumWorkflowTargetModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.WorkflowTargetMode[] | ListEnumWorkflowTargetModeFieldRefInput<$PrismaModel>
    not?: NestedEnumWorkflowTargetModeFilter<$PrismaModel> | $Enums.WorkflowTargetMode
  }

  export type NestedEnumWorkflowTriggerWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.WorkflowTrigger | EnumWorkflowTriggerFieldRefInput<$PrismaModel>
    in?: $Enums.WorkflowTrigger[] | ListEnumWorkflowTriggerFieldRefInput<$PrismaModel>
    notIn?: $Enums.WorkflowTrigger[] | ListEnumWorkflowTriggerFieldRefInput<$PrismaModel>
    not?: NestedEnumWorkflowTriggerWithAggregatesFilter<$PrismaModel> | $Enums.WorkflowTrigger
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumWorkflowTriggerFilter<$PrismaModel>
    _max?: NestedEnumWorkflowTriggerFilter<$PrismaModel>
  }

  export type NestedEnumWorkflowStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.WorkflowStatus | EnumWorkflowStatusFieldRefInput<$PrismaModel>
    in?: $Enums.WorkflowStatus[] | ListEnumWorkflowStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.WorkflowStatus[] | ListEnumWorkflowStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumWorkflowStatusWithAggregatesFilter<$PrismaModel> | $Enums.WorkflowStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumWorkflowStatusFilter<$PrismaModel>
    _max?: NestedEnumWorkflowStatusFilter<$PrismaModel>
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

  export type NestedEnumWorkflowTargetModeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.WorkflowTargetMode | EnumWorkflowTargetModeFieldRefInput<$PrismaModel>
    in?: $Enums.WorkflowTargetMode[] | ListEnumWorkflowTargetModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.WorkflowTargetMode[] | ListEnumWorkflowTargetModeFieldRefInput<$PrismaModel>
    not?: NestedEnumWorkflowTargetModeWithAggregatesFilter<$PrismaModel> | $Enums.WorkflowTargetMode
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumWorkflowTargetModeFilter<$PrismaModel>
    _max?: NestedEnumWorkflowTargetModeFilter<$PrismaModel>
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

  export type WorkflowCreateWithoutApplicationInput = {
    id: string
    name: string
    trigger: $Enums.WorkflowTrigger
    status: $Enums.WorkflowStatus
    maxDepth: number
    targetMode: $Enums.WorkflowTargetMode
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type WorkflowUncheckedCreateWithoutApplicationInput = {
    id: string
    name: string
    trigger: $Enums.WorkflowTrigger
    status: $Enums.WorkflowStatus
    maxDepth: number
    targetMode: $Enums.WorkflowTargetMode
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type WorkflowCreateOrConnectWithoutApplicationInput = {
    where: WorkflowWhereUniqueInput
    create: XOR<WorkflowCreateWithoutApplicationInput, WorkflowUncheckedCreateWithoutApplicationInput>
  }

  export type WorkflowCreateManyApplicationInputEnvelope = {
    data: WorkflowCreateManyApplicationInput | WorkflowCreateManyApplicationInput[]
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

  export type WorkflowUpsertWithWhereUniqueWithoutApplicationInput = {
    where: WorkflowWhereUniqueInput
    update: XOR<WorkflowUpdateWithoutApplicationInput, WorkflowUncheckedUpdateWithoutApplicationInput>
    create: XOR<WorkflowCreateWithoutApplicationInput, WorkflowUncheckedCreateWithoutApplicationInput>
  }

  export type WorkflowUpdateWithWhereUniqueWithoutApplicationInput = {
    where: WorkflowWhereUniqueInput
    data: XOR<WorkflowUpdateWithoutApplicationInput, WorkflowUncheckedUpdateWithoutApplicationInput>
  }

  export type WorkflowUpdateManyWithWhereWithoutApplicationInput = {
    where: WorkflowScalarWhereInput
    data: XOR<WorkflowUpdateManyMutationInput, WorkflowUncheckedUpdateManyWithoutApplicationInput>
  }

  export type WorkflowScalarWhereInput = {
    AND?: WorkflowScalarWhereInput | WorkflowScalarWhereInput[]
    OR?: WorkflowScalarWhereInput[]
    NOT?: WorkflowScalarWhereInput | WorkflowScalarWhereInput[]
    id?: UuidFilter<"Workflow"> | string
    name?: StringFilter<"Workflow"> | string
    trigger?: EnumWorkflowTriggerFilter<"Workflow"> | $Enums.WorkflowTrigger
    status?: EnumWorkflowStatusFilter<"Workflow"> | $Enums.WorkflowStatus
    maxDepth?: IntFilter<"Workflow"> | number
    targetMode?: EnumWorkflowTargetModeFilter<"Workflow"> | $Enums.WorkflowTargetMode
    applicationId?: UuidNullableFilter<"Workflow"> | string | null
    createdAt?: DateTimeFilter<"Workflow"> | Date | string
    updatedAt?: DateTimeFilter<"Workflow"> | Date | string
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
    workflows?: WorkflowCreateNestedManyWithoutApplicationInput
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
    workflows?: WorkflowUncheckedCreateNestedManyWithoutApplicationInput
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
    workflows?: WorkflowUpdateManyWithoutApplicationNestedInput
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
    workflows?: WorkflowUncheckedUpdateManyWithoutApplicationNestedInput
  }

  export type ApplicationCreateWithoutWorkflowsInput = {
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

  export type ApplicationUncheckedCreateWithoutWorkflowsInput = {
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

  export type ApplicationCreateOrConnectWithoutWorkflowsInput = {
    where: ApplicationWhereUniqueInput
    create: XOR<ApplicationCreateWithoutWorkflowsInput, ApplicationUncheckedCreateWithoutWorkflowsInput>
  }

  export type ApplicationUpsertWithoutWorkflowsInput = {
    update: XOR<ApplicationUpdateWithoutWorkflowsInput, ApplicationUncheckedUpdateWithoutWorkflowsInput>
    create: XOR<ApplicationCreateWithoutWorkflowsInput, ApplicationUncheckedCreateWithoutWorkflowsInput>
    where?: ApplicationWhereInput
  }

  export type ApplicationUpdateToOneWithWhereWithoutWorkflowsInput = {
    where?: ApplicationWhereInput
    data: XOR<ApplicationUpdateWithoutWorkflowsInput, ApplicationUncheckedUpdateWithoutWorkflowsInput>
  }

  export type ApplicationUpdateWithoutWorkflowsInput = {
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

  export type ApplicationUncheckedUpdateWithoutWorkflowsInput = {
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

  export type WorkflowCreateManyApplicationInput = {
    id: string
    name: string
    trigger: $Enums.WorkflowTrigger
    status: $Enums.WorkflowStatus
    maxDepth: number
    targetMode: $Enums.WorkflowTargetMode
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

  export type WorkflowUpdateWithoutApplicationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trigger?: EnumWorkflowTriggerFieldUpdateOperationsInput | $Enums.WorkflowTrigger
    status?: EnumWorkflowStatusFieldUpdateOperationsInput | $Enums.WorkflowStatus
    maxDepth?: IntFieldUpdateOperationsInput | number
    targetMode?: EnumWorkflowTargetModeFieldUpdateOperationsInput | $Enums.WorkflowTargetMode
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WorkflowUncheckedUpdateWithoutApplicationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trigger?: EnumWorkflowTriggerFieldUpdateOperationsInput | $Enums.WorkflowTrigger
    status?: EnumWorkflowStatusFieldUpdateOperationsInput | $Enums.WorkflowStatus
    maxDepth?: IntFieldUpdateOperationsInput | number
    targetMode?: EnumWorkflowTargetModeFieldUpdateOperationsInput | $Enums.WorkflowTargetMode
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WorkflowUncheckedUpdateManyWithoutApplicationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    trigger?: EnumWorkflowTriggerFieldUpdateOperationsInput | $Enums.WorkflowTrigger
    status?: EnumWorkflowStatusFieldUpdateOperationsInput | $Enums.WorkflowStatus
    maxDepth?: IntFieldUpdateOperationsInput | number
    targetMode?: EnumWorkflowTargetModeFieldUpdateOperationsInput | $Enums.WorkflowTargetMode
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
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