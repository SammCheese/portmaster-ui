import { DragDropModule } from '@angular/cdk/drag-drop';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CdkTableModule } from '@angular/cdk/table';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { MarkdownModule } from 'ngx-markdown';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { IntroModule } from './intro';
import { NavigationComponent } from './layout/navigation/navigation';
import { SideDashComponent } from './layout/side-dash/side-dash';
import { AppOverviewComponent, AppViewComponent, QuickSettingInternetButtonComponent } from './pages/app-view';
import { QuickSettingUseSPNButtonComponent } from './pages/app-view/qs-use-spn/qs-use-spn';
import { MonitorApplicationViewComponent, MonitorPageComponent, NetworkOverviewComponent } from './pages/monitor';
import { SettingsComponent } from './pages/settings/settings';
import { SpnPageComponent } from './pages/spn';
import { SupportPageComponent } from './pages/support';
import { SupportFormComponent } from './pages/support/form';
import { WidgetSettingsOutletComponent } from './pages/widget-settings-outlet/widget-settings-outlet';
import { SfngAccordionModule } from './shared/accordion';
import { ActionIndicatorModule } from './shared/action-indicator';
import { AppIconComponent } from './shared/app-icon';
import { ConfigModule } from './shared/config';
import { CanShowConnection as CanShowConnectionPipe, CanUseRulesPipe, ConnectionExpertisePipe, ConnectionLocationPipe, ConnectionsViewComponent, IsBlockedConnectionPipe, ScopeGroupContentComponent, UngroupedConnectionContentComponent, UngroupedConnectionRowComponent } from './shared/connections-view';
import { CountIndicatorComponent } from './shared/count-indicator/count-indicator';
import { PrettyCountPipe } from './shared/count.pipe';
import { CountryFlagDirective } from './shared/country-flag/country-flag';
import { DialogModule } from './shared/dialog';
import { SfngDropDownModule } from './shared/dropdown/dropdown.module';
import { ExitScreenComponent } from './shared/exit-screen/exit-screen';
import { ExpertiseModule } from './shared/expertise/expertise.module';
import { ExternalLinkDirective } from './shared/external-link.directive';
import { SfngFocusModule } from './shared/focus';
import { FuzzySearchPipe } from './shared/fuzzySearch';
import { LoadingComponent } from './shared/loading';
import { SfngMenuModule } from './shared/menu';
import { SfngMultiSwitchModule } from './shared/multi-switch';
import { NotificationComponent } from './shared/notification/notification';
import { OverlayStepperModule } from './shared/overlay-stepper';
import { PaginationContentDirective, PaginationWrapperComponent } from './shared/pagination';
import { ProfileStatisticsComponent } from './shared/profile-stats';
import { ScopeLabelComponent } from './shared/scope-label';
import { SfngSelectModule } from './shared/select';
import { TabModule } from './shared/tabs/tabs.module';
import { PlaceholderComponent } from './shared/text-placeholder';
import { TimeAgoPipe } from './shared/time-ago.pipe';
import { TipUpModule } from './shared/tipup';
import { SfngToggleSwitchModule } from './shared/toggle-switch';
import { SfngTooltipModule } from './shared/tooltip';
import { MarkdownWidgetComponent, MarkdownWidgetSettingsComponent } from './widgets/markdown-widget';
import { NotificationWidgetComponent, NotificationWidgetSettingsComponent } from './widgets/notification-widget';
import { PilotWidgetComponent } from './widgets/pilot-widget';
import { PromptWidgetComponent } from './widgets/prompt-widget';
import { StatusWidgetComponent, StatusWidgetSettingsComponent } from './widgets/status-widget';
import { WIDGET_DEFINTIONS } from './widgets/widget.types';

@NgModule({
  declarations: [
    AppComponent,
    NotificationComponent,
    SettingsComponent,
    MonitorPageComponent,
    SideDashComponent,
    NavigationComponent,
    ConnectionsViewComponent,
    WidgetSettingsOutletComponent,
    StatusWidgetComponent,
    StatusWidgetSettingsComponent,
    PilotWidgetComponent,
    StatusWidgetComponent,
    StatusWidgetSettingsComponent,
    MarkdownWidgetSettingsComponent,
    ProfileStatisticsComponent,
    MarkdownWidgetComponent,
    NotificationWidgetSettingsComponent,
    NotificationWidgetComponent,
    FuzzySearchPipe,
    TimeAgoPipe,
    MonitorApplicationViewComponent,
    CountIndicatorComponent,
    AppViewComponent,
    QuickSettingInternetButtonComponent,
    QuickSettingUseSPNButtonComponent,
    CountryFlagDirective,
    AppOverviewComponent,
    PlaceholderComponent,
    AppIconComponent,
    NetworkOverviewComponent,
    PromptWidgetComponent,
    LoadingComponent,
    ExternalLinkDirective,
    ScopeLabelComponent,
    ScopeGroupContentComponent,
    UngroupedConnectionContentComponent,
    UngroupedConnectionRowComponent,
    ConnectionExpertisePipe,
    ConnectionLocationPipe,
    PrettyCountPipe,
    CanUseRulesPipe,
    CanShowConnectionPipe,
    IsBlockedConnectionPipe,
    ExitScreenComponent,
    SupportPageComponent,
    SupportFormComponent,
    PaginationWrapperComponent,
    PaginationContentDirective,
    SpnPageComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    FormsModule,
    AppRoutingModule,
    FontAwesomeModule,
    OverlayModule,
    PortalModule,
    CdkTableModule,
    DragDropModule,
    HttpClientModule,
    MarkdownModule.forRoot(),
    ScrollingModule,
    SfngAccordionModule,
    TabModule,
    TipUpModule,
    SfngTooltipModule,
    ActionIndicatorModule,
    DialogModule,
    OverlayStepperModule,
    IntroModule,
    SfngDropDownModule,
    SfngSelectModule,
    SfngMultiSwitchModule,
    SfngMenuModule,
    SfngFocusModule,
    SfngToggleSwitchModule,
    ExpertiseModule,
    ConfigModule,
  ],
  providers: [
    {
      provide: WIDGET_DEFINTIONS,
      useValue: {
        type: 'status-widget',
        name: 'Demo',
        settingsComponent: StatusWidgetSettingsComponent,
        widgetComponent: StatusWidgetComponent,
      },
      multi: true,
    },
    {
      provide: WIDGET_DEFINTIONS,
      useValue: {
        type: 'markdown-widget',
        name: 'Markdown',
        settingsComponent: MarkdownWidgetSettingsComponent,
        widgetComponent: MarkdownWidgetComponent,
      },
      multi: true,
    },
    {
      provide: WIDGET_DEFINTIONS,
      useValue: {
        type: 'pilot-widget',
        name: 'Pilot',
        widgetComponent: PilotWidgetComponent,
        disableCustom: true,
        tipUpKey: "pilot-widget"
      },
      multi: true,
    },
    {
      provide: WIDGET_DEFINTIONS,
      useValue: {
        type: 'notification-widget',
        name: 'Notifications',
        widgetComponent: NotificationWidgetComponent,
        //settingsComponent: NotificationWidgetSettingsComponent,
      },
      multi: true,
    },
    {
      provide: WIDGET_DEFINTIONS,
      useValue: {
        type: 'prompt-widget',
        name: 'Prompts',
        widgetComponent: PromptWidgetComponent,
      },
      multi: true,
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(library: FaIconLibrary) {
    library.addIconPacks(fas, far);
    library.addIcons(faGithub)
  }
}
