import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppProfile, AppProfileService, ChartResult, Condition, ConfigService, DebugAPI, ExpertiseLevel, FlatConfigObject, flattenProfileConfig, IProfileStats, LayeredProfile, Netquery, setAppSetting, Setting } from '@safing/portmaster-api';
import { SfngDialogService } from '@safing/ui';
import { BehaviorSubject, combineLatest, interval, Observable, of, Subscription } from 'rxjs';
import { distinctUntilChanged, map, mergeMap, startWith, switchMap } from 'rxjs/operators';
import { SessionDataService } from 'src/app/services';
import { ActionIndicatorService } from 'src/app/shared/action-indicator';
import { fadeInAnimation, fadeOutAnimation } from 'src/app/shared/animations';
import { SaveSettingEvent } from 'src/app/shared/config/generic-setting/generic-setting';
import { ExpertiseService } from 'src/app/shared/expertise';
import { SfngNetqueryViewer } from 'src/app/shared/netquery';
import { EditProfileDialog } from './../../shared/edit-profile-dialog/edit-profile-dialog';

@Component({
  templateUrl: './app-view.html',
  styleUrls: ['../page.scss', './app-view.scss'],
  animations: [
    fadeOutAnimation,
    fadeInAnimation,
  ]
})
export class AppViewComponent implements OnInit, OnDestroy {
  @ViewChild(SfngNetqueryViewer)
  netqueryViewer?: SfngNetqueryViewer;

  /** subscription to our update-process observable */
  private subscription = Subscription.EMPTY;

  /**
   * @private
   * The current chart data
   */
  appChartData: ChartResult[] = [];

  /**
   * @private
   * The current AppProfile we are showing.
   */
  appProfile: AppProfile | null = null;

  /**
   * @private
   * Whether or not the overview componet should be rendered.
   */
  get showOverview() {
    return this.appProfile == null && !this._loading
  }

  /**
   * @private
   * The currently displayed list of settings
   */
  settings: Setting[] = [];

  /**
   * @private
   * All available settings.
   */
  allSettings: Setting[] = [];

  /**
   * @private
   * The current search term displayed in the search-input.
   */
  searchTerm = '';

  /**
   * @private
   * The key of the setting to highligh, if any ...
   */
  highlightSettingKey: string | null = null;

  /**
   * @private
   * Emits whenever the currently used settings "view" changes.
   */
  viewSettingChange = new BehaviorSubject<'all' | 'active'>('all');

  /**
   * @private
   * The path of the application binary
   */
  applicationDirectory = '';

  /**
   * @private
   * The name of the binary
   */
  binaryName = ''

  /**
   * @private
   * Whether or not the profile warning message should be displayed
   */
  displayWarning = false;

  /**
   * @private
   * The current profile statistics
   */
  stats: IProfileStats | null = null;

  /**
   * @private
   * The internal, layered profile if the app is active
   */
  layeredProfile: LayeredProfile | null = null;

  /** Used to track whether we are already initialized */
  private _loading = true;

  /**
   * @private
   *
   * Defines what "view" we are currently in
   */
  get viewSetting(): 'all' | 'active' {
    return this.viewSettingChange.getValue();
  };

  /** A lookup map from tag ID to tag Name */
  tagNames: {
    [tagID: string]: string
  } = {}

  collapseHeader = false;

  constructor(
    public sessionDataService: SessionDataService,
    private profileService: AppProfileService,
    private route: ActivatedRoute,
    private netquery: Netquery,
    private cdr: ChangeDetectorRef,
    private configService: ConfigService,
    private router: Router,
    private actionIndicator: ActionIndicatorService,
    private dialog: SfngDialogService,
    private debugAPI: DebugAPI,
    private expertiseService: ExpertiseService,
  ) { }

  /**
   * @private
   * Used to save a change in the app settings. Emitted by the config-view
   * component
   *
   * @param event The emitted save-settings-event.
   */
  saveSetting(event: SaveSettingEvent) {
    // Guard against invalid usage and abort if there's not appProfile
    // to save.
    if (!this.appProfile) {
      return;
    }

    // If the value has been "reset to global value" we need to
    // set the value to "undefined".
    if (event.isDefault) {
      setAppSetting(this.appProfile!.Config, event.key, undefined);
    } else {
      setAppSetting(this.appProfile!.Config, event.key, event.value);
    }

    // Actually safe the profile
    this.profileService.saveProfile(this.appProfile!)
      .subscribe({
        next: () => {
          if (!!event.accepted) {
            event.accepted();
          }
        },
        error: err => {
          // if there's a callback function for errors call it.
          if (!!event.rejected) {
            event.rejected(err);
          }

          console.error(err);
          this.actionIndicator.error('Failed to save setting', err);
        },
      })
  }

  editProfile() {
    if (!this.appProfile) {
      return;
    }

    this.dialog.create(EditProfileDialog, {
      backdrop: true,
      autoclose: false,
      data: `${this.appProfile.Source}/${this.appProfile.ID}`,
    }).onAction('deleted', () => {
      // navigate to the app overview if it has been deleted.
      this.router.navigate(['/app/'])
    })
  }

  ngOnInit() {
    this.profileService.tagDescriptions()
      .subscribe(tags => {
        tags.forEach(t => {
          this.tagNames[t.ID] = t.Name
          this.cdr.markForCheck();
        })
      })

    // watch the route parameters and start watching the referenced
    // application profile, it's layer profile and polling the stats.
    const profileStream: Observable<[AppProfile, LayeredProfile | null, IProfileStats | null] | null>
      = this.route.paramMap
        .pipe(
          switchMap(params => {
            // Get the profile source and id. If one is unset (null)
            // than return a"null" emit-once stream.
            const source = params.get("source");
            const id = params.get("id")
            if (source === null || id === null) {
              this._loading = false;
              return of(null);
            }
            this._loading = true;

            this.appChartData = [];
            this.appProfile = null;
            this.stats = null;

            // Start watching the application profile.
            // switchMap will unsubscribe automatically if
            // we start watching a different profile.
            return combineLatest([
              this.profileService.watchAppProfile(source, id),
              this.profileService.watchLayeredProfile(source, id)
                .pipe(startWith(null)),
              interval(10000)
                .pipe(
                  startWith(-1),
                  mergeMap(() => this.netquery.getProfileStats({
                    profile: `${source}/${id}`,
                  }).pipe(map(result => result?.[0]))),
                  startWith(null),
                )
            ])
          })
        );

    // used to track changes to the object identity of the global configuration
    let prevousGlobal: FlatConfigObject = {};

    this.subscription =
      combineLatest([
        profileStream,                        // emits the current app profile everytime it changes
        this.route.queryParamMap,             // for changes to the settings= query parameter
        this.profileService.globalConfig(),   // for changes to ghe global profile
        this.configService.query(""),         // get ALL settings (once, only the defintion is of intereset)
        this.viewSettingChange.pipe(          // watch the current "settings-view" setting, but only if it changes
          distinctUntilChanged(),
        ),
      ])
        .subscribe(async ([profile, queryMap, global, allSettings, viewSetting]) => {
          const previousProfile = this.appProfile;

          if (!!profile) {
            const query: Condition = {
              profile: profile![0].Source + "/" + profile![0].ID,
            }

            // ignore internal connections if the user is not in developer mode.
            if (this.expertiseService.currentLevel !== ExpertiseLevel.Developer) {
              query.internal = {
                $eq: false,
              };
            }

            this.netquery.activeConnectionChart(query)
              .subscribe(data => {
                this.appChartData = data;
                this.cdr.markForCheck();
              })

            this.appProfile = profile[0] || null;
            this.layeredProfile = profile[1] || null;
            this.stats = profile[2] || null;
          } else {
            this.appProfile = null;
            this.layeredProfile = null;
            this.stats = null;
          }

          this.displayWarning = false;

          if (this.appProfile?.WarningLastUpdated) {
            const now = new Date().getTime()
            const diff = now - new Date(this.appProfile.WarningLastUpdated).getTime()
            this.displayWarning = diff < 1000 * 60 * 60 * 24 * 7;
          }

          if (!!this.netqueryViewer && this._loading) {
            this.netqueryViewer.performSearch();
          }

          this._loading = false;

          if (!!this.appProfile?.PresentationPath) {
            let parts: string[] = [];
            let sep = '/'
            if (this.appProfile.PresentationPath[0] === '/') {
              // linux, darwin, bsd ...
              sep = '/'
            } else {
              // windows ...
              sep = '\\'
            }
            parts = this.appProfile.PresentationPath.split(sep)

            this.binaryName = parts.pop()!;
            this.applicationDirectory = parts.join(sep)
          } else {
            this.applicationDirectory = '';
            this.binaryName = '';
          }


          this.highlightSettingKey = queryMap.get('setting');
          let profileConfig: FlatConfigObject = {};

          // if we have a profile flatten it's configuration map to something
          // more useful.
          if (!!this.appProfile) {
            profileConfig = flattenProfileConfig(this.appProfile.Config);
          }

          // if we should highlight a setting make sure to switch the
          // viewSetting to all if it's the "global" default (that is, no
          // value is set). Otherwise the setting won't render and we cannot
          // highlight it.
          // We need to keep this even though we default to "all" now since
          // the following might happen:
          //  - user already navigated to an app-page and selected "View Active".
          //  - a notification comes in that has a "show setting" action
          //  - the user clicks the action button and the setting should be displayed
          //  - since the requested setting has not been changed it is not available
          //    in "View Active" so we need to switch back to "View All". Otherwise
          //    the action button would fail and the user would not notice something
          //    changing.
          //
          if (!!this.highlightSettingKey) {
            if (profileConfig[this.highlightSettingKey] === undefined) {
              this.viewSettingChange.next('all');
            }
          }

          // check if we got new values for the profile or the settings. In both cases, we need to update the
          // profile settings displayed as there might be new values to show.
          const profileChanged = (previousProfile !== this.appProfile);
          const settingsChanged = (allSettings !== this.allSettings);
          const globalChanged = (global !== prevousGlobal);

          const settingsNeedUpdate = profileChanged || settingsChanged || globalChanged;

          // save the current global config object so we can compare for identity changes
          // the next time we're executed
          prevousGlobal = global;

          if (!!this.appProfile && settingsNeedUpdate) {

            // filter the settings and remove all settings that are not
            // profile specific (i.e. not part of the global config). Also
            // update the current settings value (from the app profile) and
            // the default value (from the global profile).
            let countModified = 0;
            this.settings = allSettings
              .map(setting => {
                setting.Value = profileConfig[setting.Key];
                setting.GlobalDefault = global[setting.Key];
                return setting;
              })
              .filter(setting => {
                if (!(setting.Key in global)) {
                  return false;
                }

                const isModified = setting.Value !== undefined;
                if (isModified) {
                  countModified++;
                }
                if (this.viewSetting === 'all') {
                  return true;
                }
                return isModified;
              });

            this.allSettings = allSettings;
          }

          this.cdr.markForCheck();
        });
  }

  /**
   * @private
   * Retrieves debug information from the current
   * profile and copies it to the clipboard
   */
  copyDebugInfo() {
    if (!this.appProfile) {
      return;
    }

    this.debugAPI.getProfileDebugInfo(this.appProfile.Source, this.appProfile.ID)
      .subscribe(data => {
        console.log(data);
        // Copy to clip-board if supported
        if (!!navigator.clipboard) {
          navigator.clipboard.writeText(data);
          this.actionIndicator.success('Copied to Clipboard')
        }
      })
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /**
   * @private
   * Delete the current profile. Requires a two-step confirmation.
   */
  deleteProfile() {
    if (!this.appProfile) {
      return;
    }

    this.dialog.confirm({
      canCancel: true,
      caption: 'Caution',
      header: 'Deleting Profile ' + this.appProfile.Name,
      message: 'Do you really want to delete this profile? All settings will be lost.',
      buttons: [
        { id: '', text: 'Cancel', class: 'outline' },
        { id: 'delete', class: 'danger', text: 'Yes, delete it' },
      ]
    })
      .onAction('delete', () => {
        this.profileService.deleteProfile(this.appProfile!)
          .subscribe(() => {
            this.router.navigate(['/app/overview'])
            this.actionIndicator.success('Profile Deleted', 'Successfully deleted profile '
              + this.appProfile?.Name);
          })
      })
  }
}
