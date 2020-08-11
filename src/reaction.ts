import StreamClient, { APIResponse, UnknownRecord } from './client';
import StreamFeed from './feed';
import * as errors from './errors';

export type TargetFeeds = (string | StreamFeed)[];

export type TargetFeed = string | StreamFeed;

export type TargetFeedsExtraData = Record<string, unknown>;

type ReactionBody<T> = {
  activity_id?: string; // only required for reactions
  data?: T | UnknownRecord;
  id?: string; // api will generate an id if it's missing
  kind?: string; // required only for add/addChile, not update
  parent?: string; // only required for child reactions
  target_feeds?: string[];
  target_feeds_extra_data?: TargetFeedsExtraData;
  user_id?: string; // optional when using client tokens
};

export type Reaction<T extends UnknownRecord = UnknownRecord> = {
  activity_id: string;
  created_at: string;
  data: T;
  id: string;
  kind: string;
  parent: string;
  updated_at: string;
  user_id: string;
  target_feeds?: string[];
  target_feeds_extra_data?: TargetFeedsExtraData;
};

export type ReactionAPIResponse<T extends UnknownRecord = UnknownRecord> = APIResponse & Reaction<T>;

export type EnrichedReaction<
  ReactionType extends UnknownRecord = UnknownRecord,
  ChildReactionType extends UnknownRecord = UnknownRecord,
  UserType extends UnknownRecord = UnknownRecord
> = Reaction<ReactionType | ChildReactionType> & {
  children_counts: Record<string, number>;
  latest_children: Record<string, ChildReactionType>;
  latest_children_extra?: Record<string, { next?: string }>;
  own_children?: Record<string, ChildReactionType>;
  user?: UserType;
};

export type EnrichedReactionAPIResponse<
  ReactionType extends UnknownRecord = UnknownRecord,
  ChildReactionType extends UnknownRecord = UnknownRecord,
  UserType extends UnknownRecord = UnknownRecord
> = APIResponse & EnrichedReaction<ReactionType, ChildReactionType, UserType>;

export type ReactionFilterAPIResponse<
  ReactionType extends UnknownRecord = UnknownRecord,
  ChildReactionType extends UnknownRecord = UnknownRecord,
  ActivityType extends UnknownRecord = UnknownRecord,
  UserType extends UnknownRecord = UnknownRecord
> = APIResponse & {
  next: string;
  results:
    | ReactionAPIResponse<ReactionType | ChildReactionType>[]
    | EnrichedReactionAPIResponse<ReactionType, ChildReactionType, UserType>[];
  activity?: ActivityType;
};

export default class StreamReaction<
  UserType extends UnknownRecord = UnknownRecord,
  ActivityType extends UnknownRecord = UnknownRecord,
  CollectionType extends UnknownRecord = UnknownRecord,
  ReactionType extends UnknownRecord = UnknownRecord,
  ChildReactionType extends UnknownRecord = UnknownRecord
> {
  client: StreamClient;
  token: string;

  constructor(client: StreamClient, token: string) {
    /**
     * Initialize a reaction object
     * @method constructor
     * @memberof StreamReaction.prototype
     * @param {StreamClient} client Stream client this feed is constructed from
     * @param {string} token JWT token
     * @example new StreamReaction(client, "eyJhbGciOiJIUzI1...")
     */
    this.client = client;
    this.token = token;
  }

  buildURL = (...args: string[]) => {
    return `${['reaction', ...args].join('/')}/`;
  };

  _convertTargetFeeds = (targetFeeds: TargetFeeds = []) => {
    return targetFeeds.map((elem: TargetFeed) => (typeof elem === 'string' ? elem : (elem as StreamFeed).id));
  };

  add(
    kind: string,
    activity: string | { id: string },
    data: ReactionType,
    {
      id,
      targetFeeds = [],
      userId,
      targetFeedsExtraData,
    }: { id?: string; targetFeeds?: TargetFeeds; targetFeedsExtraData?: TargetFeedsExtraData; userId?: string } = {},
  ) {
    /**
     * add reaction
     * @method add
     * @memberof StreamReaction.prototype
     * @param  {string}   kind  kind of reaction
     * @param  {string}   activity Activity or an ActivityID
     * @param  {ReactionType}   data  data related to reaction
     * @param  {object} [options]
     * @param  {string} [options.id] id associated with reaction
     * @param  {string[]} [options.targetFeeds] an array of feeds to which to send an activity with the reaction
     * @param  {string} [options.userId] useful for adding reaction with server token
     * @param  {object} [options.targetFeedsExtraData] extra data related to target feeds
     * @return {Promise<ReactionAPIResponse<ReactionType>>}
     * @example reactions.add("like", "0c7db91c-67f9-11e8-bcd9-fe00a9219401")
     * @example reactions.add("comment", "0c7db91c-67f9-11e8-bcd9-fe00a9219401", {"text": "love it!"},)
     */
    const body: ReactionBody<ReactionType> = {
      id,
      activity_id: activity instanceof Object ? (activity as { id: string }).id : activity,
      kind,
      data: data || {},
      target_feeds: this._convertTargetFeeds(targetFeeds),
      user_id: userId,
    };
    if (targetFeedsExtraData != null) {
      body.target_feeds_extra_data = targetFeedsExtraData;
    }
    return this.client.post<ReactionAPIResponse<ReactionType>>({
      url: this.buildURL(),
      body,
      signature: this.token,
    });
  }

  addChild(
    kind: string,
    reaction: string | { id: string },
    data: ChildReactionType,
    {
      targetFeeds = [],
      userId,
      targetFeedsExtraData,
    }: {
      targetFeeds?: TargetFeeds;
      targetFeedsExtraData?: TargetFeedsExtraData;
      userId?: string;
    } = {},
  ) {
    /**
     * add child reaction
     * @method addChild
     * @memberof StreamReaction.prototype
     * @param  {string}   kind  kind of reaction
     * @param  {string}   reaction Reaction or a ReactionID
     * @param  {ChildReactionType}   data  data related to reaction
     * @param  {object} [options]
     * @param  {string[]} [options.targetFeeds] an array of feeds to which to send an activity with the reaction
     * @param  {string} [options.userId] useful for adding reaction with server token
     * @param  {object} [options.targetFeedsExtraData] extra data related to target feeds
     * @return {Promise<ReactionAPIResponse<ChildReactionType>>}
     * @example reactions.add("like", "0c7db91c-67f9-11e8-bcd9-fe00a9219401")
     * @example reactions.add("comment", "0c7db91c-67f9-11e8-bcd9-fe00a9219401", {"text": "love it!"},)
     */
    const body: ReactionBody<ChildReactionType> = {
      parent: reaction instanceof Object ? (reaction as { id: string }).id : reaction,
      kind,
      data: data || {},
      target_feeds: this._convertTargetFeeds(targetFeeds),
      user_id: userId,
    };
    if (targetFeedsExtraData != null) {
      body.target_feeds_extra_data = targetFeedsExtraData;
    }
    return this.client.post<ReactionAPIResponse<ChildReactionType>>({
      url: this.buildURL(),
      body,
      signature: this.token,
    });
  }

  get(id: string) {
    /**
     * get reaction
     * @method get
     * @memberof StreamReaction.prototype
     * @param  {string}   id Reaction Id
     * @return {Promise<EnrichedReactionAPIResponse<ReactionType, ChildReactionType, UserType>>}
     * @example reactions.get("67b3e3b5-b201-4697-96ac-482eb14f88ec")
     */
    return this.client.get<EnrichedReactionAPIResponse<ReactionType, ChildReactionType, UserType>>({
      url: this.buildURL(id),
      signature: this.token,
    });
  }

  filter(conditions: {
    activity_id?: string;
    id_gt?: string;
    id_gte?: string;
    id_lt?: string;
    id_lte?: string;
    kind?: string;
    limit?: number;
    reaction_id?: string;
    user_id?: string;
    with_activity_data?: boolean;
  }) {
    /**
     * retrieve reactions by activity_id, user_id or reaction_id (to paginate children reactions), pagination can be done using id_lt, id_lte, id_gt and id_gte parameters
     * id_lt and id_lte return reactions order by creation descending starting from the reaction with the ID provided, when id_lte is used
     * the reaction with ID equal to the value provided is included.
     * id_gt and id_gte return reactions order by creation ascending (oldest to newest) starting from the reaction with the ID provided, when id_gte is used
     * the reaction with ID equal to the value provided is included.
     * results are limited to 25 at most and are ordered newest to oldest by default.
     * @method filter
     * @memberof StreamReaction.prototype
     * @param  {object}   conditions Reaction Id {activity_id|user_id|reaction_id:string, kind:string, limit:integer}
     * @return {Promise<ReactionFilterAPIResponse<ReactionType, ChildReactionType, ActivityType, UserType>>}
     * @example reactions.filter({activity_id: "0c7db91c-67f9-11e8-bcd9-fe00a9219401", kind:"like"})
     * @example reactions.filter({user_id: "john", kinds:"like"})
     */

    const { user_id: userId, activity_id: activityId, reaction_id: reactionId, ...qs } = conditions;
    if (!qs.limit) {
      qs.limit = 10;
    }

    if ((userId ? 1 : 0) + (activityId ? 1 : 0) + (reactionId ? 1 : 0) !== 1) {
      throw new errors.SiteError(
        'Must provide exactly one value for one of these params: user_id, activity_id, reaction_id',
      );
    }

    const lookupType = (userId && 'user_id') || (activityId && 'activity_id') || (reactionId && 'reaction_id');
    const value = userId || activityId || reactionId;

    const url = conditions.kind
      ? this.buildURL(lookupType as string, value as string, conditions.kind)
      : this.buildURL(lookupType as string, value as string);

    return this.client.get<ReactionFilterAPIResponse<ReactionType, ChildReactionType, ActivityType, UserType>>({
      url,
      qs: qs as { [key: string]: unknown },
      signature: this.token,
    });
  }

  update(
    id: string,
    data: ReactionType | ChildReactionType,
    {
      targetFeeds = [],
      targetFeedsExtraData,
    }: { targetFeeds?: string[] | StreamFeed[]; targetFeedsExtraData?: TargetFeedsExtraData } = {},
  ) {
    /**
     * update reaction
     * @method update
     * @memberof StreamReaction.prototype
     * @param  {string}   id Reaction Id
     * @param  {ReactionType | ChildReactionType}   data  Data associated to reaction or childReaction
     * @param  {object} [options]
     * @param  {string[]} [options.targetFeeds] Optional feeds to post the activity to. If you sent this before and don't set it here it will be removed.
     * @param  {object} [options.targetFeedsExtraData] extra data related to target feeds
     * @return {Promise<ReactionAPIResponse<ReactionType | ChildReactionType>>}
     * @example reactions.update("67b3e3b5-b201-4697-96ac-482eb14f88ec", "0c7db91c-67f9-11e8-bcd9-fe00a9219401", "like")
     * @example reactions.update("67b3e3b5-b201-4697-96ac-482eb14f88ec", "0c7db91c-67f9-11e8-bcd9-fe00a9219401", "comment", {"text": "love it!"},)
     */
    const body: ReactionBody<ReactionType | ChildReactionType> = {
      data,
      target_feeds: this._convertTargetFeeds(targetFeeds),
    };
    if (targetFeedsExtraData != null) {
      body.target_feeds_extra_data = targetFeedsExtraData;
    }
    return this.client.put<ReactionAPIResponse<ReactionType | ChildReactionType>>({
      url: this.buildURL(id),
      body,
      signature: this.token,
    });
  }

  delete(id: string) {
    /**
     * delete reaction
     * @method delete
     * @memberof StreamReaction.prototype
     * @param  {string}   id Reaction Id
     * @return {Promise<APIResponse>}
     * @example reactions.delete("67b3e3b5-b201-4697-96ac-482eb14f88ec")
     */
    return this.client.delete({
      url: this.buildURL(id),
      signature: this.token,
    });
  }
}
