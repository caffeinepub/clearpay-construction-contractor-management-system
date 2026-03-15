import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Float "mo:core/Float";
import OutCall "http-outcalls/outcall";
import Order "mo:core/Order";
import Authorization "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import Blob "mo:core/Blob";
import Array "mo:core/Array";
import Nat8 "mo:core/Nat8";




actor {
  include MixinStorage();

  type BillKey = {
    projectId : Text;
    billNumber : Text;
  };

  module BillKey {
    public func compare(k1 : BillKey, k2 : BillKey) : Order.Order {
      let projectCmp = Text.compare(k1.projectId, k2.projectId);
      switch (projectCmp) {
        case (#less) { #less };
        case (#greater) { #greater };
        case (#equal) {
          Text.compare(k1.billNumber, k2.billNumber);
        };
      };
    };
  };

  type UserRole = Authorization.UserRole;
  type Project = {
    id : Text;
    name : Text;
    client : Text;
    startDate : Text;
    endDate : Text;
    unitPrice : Float;
    quantity : Float;
    estimatedAmount : Float;
    contactNumber : Text;
    location : Text;
    notes : Text;
    address : Text;
    attachmentLinks : [Text];
  };

  module Project {
    public func compareByOutstandingAndName(
      a : Project,
      b : Project,
      useOutstanding : Bool,
      billData : Map.Map<BillKey, Bill>,
      paymentData : Map.Map<Text, Payment>,
    ) : Order.Order {
      if (useOutstanding) {
        let outstandingA = calculateOutstanding(a.id, billData, paymentData);
        let outstandingB = calculateOutstanding(b.id, billData, paymentData);
        if (outstandingA != outstandingB) {
          return Float.compare(outstandingB, outstandingA);
        };
      };
      Text.compare(a.name, b.name);
    };

    func calculateOutstanding(projectId : Text, billData : Map.Map<BillKey, Bill>, paymentData : Map.Map<Text, Payment>) : Float {
      var totalBills = 0.0;
      var totalPayments = 0.0;

      for ((_, bill) in billData.entries()) {
        if (bill.projectId == projectId) {
          totalBills += bill.amount;
        };
      };

      for ((_, payment) in paymentData.entries()) {
        if (payment.projectId == projectId) {
          totalPayments += payment.amount;
        };
      };

      totalBills - totalPayments;
    };
  };

  stable var projects = Map.empty<Text, Project>();
  stable var completedProjectIds = Map.empty<Text, Bool>();
  stable var projectMapLocations = Map.empty<Text, Text>();

  type Bill = {
    projectId : Text;
    blockId : ?Text;
    billNumber : Text;
    description : Text;
    quantity : Float;
    unit : Text;
    unitPrice : Float;
    remarks : ?Text;
    date : Text;
    amount : Float;
    includesGst : Bool;
  };

  module Bill {
    public func compare(b1 : Bill, b2 : Bill) : Order.Order {
      switch (b1.blockId, b2.blockId) {
        case (null, null) { Text.compare(b1.billNumber, b2.billNumber) };
        case (?b1BlockId, null) { #greater };
        case (null, ?b2BlockId) { #less };
        case (?b1BlockId, ?b2BlockId) {
          let blockIdComparison = Text.compare(b1BlockId, b2BlockId);
          if (blockIdComparison == #equal) {
            Text.compare(b1.billNumber, b2.billNumber);
          } else {
            blockIdComparison;
          };
        };
      };
    };
  };

  stable var bills = Map.empty<BillKey, Bill>();

  type PaymentMode = {
    #account;
    #cash;
  };

  type Payment = {
    id : Text;
    projectId : Text;
    amount : Float;
    date : Text;
    paymentMode : PaymentMode;
    reference : Text;
    remarks : ?Text;
  };

  stable var payments = Map.empty<Text, Payment>();

  type Client = {
    id : Text;
    name : Text;
    contact : Text;
    email : Text;
    address : Text;
    notes : Text;
  };

  module Client {
    public func compare(c1 : Client, c2 : Client) : Order.Order {
      Text.compare(c1.name, c2.name);
    };
  };

  stable var clients = Map.empty<Text, Client>();

  type UserProfile = {
    fullName : Text;
    contact : Text;
    email : Text;
    role : UserRole;
    active : Bool;
    accessProjects : [Text];
  };

  stable var userProfiles = Map.empty<Principal, UserProfile>();

  let DEFAULT_ADMIN_EMAIL = "jogaraoseri.er@mktconstructions.com";
  let DEFAULT_ADMIN_CONTACT = "7575944949";
  let DEFAULT_ADMIN_NAME = "Seri Jogarao";

  type ProjectFilters = {
    search : ?Text;
    client : ?Text;
    fromDate : ?Text;
    toDate : ?Text;
    minUnitPrice : ?Float;
    maxUnitPrice : ?Float;
  };

  type BillFilters = {
    search : ?Text;
    projectId : ?Text;
    blockId : ?Text;
    billNumber : ?Text;
    client : ?Text;
    fromDate : ?Text;
    toDate : ?Text;
    minAmount : ?Float;
    maxAmount : ?Float;
    includesGst : ?Bool;
  };

  type PaymentFilters = {
    search : ?Text;
    projectId : ?Text;
    fromDate : ?Text;
    toDate : ?Text;
    minAmount : ?Float;
    maxAmount : ?Float;
    paymentMode : ?PaymentMode;
    reference : ?Text;
  };

  let accessControlState = Authorization.initState();

  type AdminPasswordData = {
    password : Text;
    hintQuestion : ?Text;
    hintAnswer : ?Text;
  };

  stable var adminPasswordData : ?AdminPasswordData = ?{
    password = "3554";
    hintQuestion = null;
    hintAnswer = null;
  };

  stable var isInitialized : Bool = false;
  stable var defaultAdminPrincipal : ?Principal = null;
  stable var userPrincipalCounter : Nat = 0;

  func isDefaultAdmin(email : Text) : Bool {
    Text.equal(email, DEFAULT_ADMIN_EMAIL);
  };

  func isDefaultAdminByPrincipal(principal : Principal) : Bool {
    switch (userProfiles.get(principal)) {
      case (null) { false };
      case (?profile) { isDefaultAdmin(profile.email) };
    };
  };

  func isAdminRole(principal : Principal) : Bool {
    switch (userProfiles.get(principal)) {
      case (null) { false };
      case (?profile) {
        switch (profile.role) {
          case (#admin) { true };
          case (_) { false };
        };
      };
    };
  };

  func isAdminUser(principal : Principal) : Bool {
    if (isDefaultAdminByPrincipal(principal)) {
      return true;
    };
    if (isAdminRole(principal)) {
      return true;
    };
    Authorization.isAdmin(accessControlState, principal);
  };

  func findPrincipalByEmail(email : Text) : ?Principal {
    for ((principal, profile) in userProfiles.entries()) {
      if (Text.equal(profile.email, email)) {
        return ?principal;
      };
    };
    null;
  };

  func isAuthenticatedUser(caller : Principal) : Bool {
    if (caller.isAnonymous()) {
      return false;
    };
    if (isDefaultAdminByPrincipal(caller)) {
      return true;
    };
    if (isAdminRole(caller)) {
      return true;
    };
    // Also check if caller has a linked profile in userProfiles (covers users linked via linkUserByEmail)
    switch (userProfiles.get(caller)) {
      case (?profile) {
        switch (profile.role) {
          case (#user) { return true };
          case (#admin) { return true };
          case (_) {};
        };
      };
      case (null) {};
    };
    Authorization.hasPermission(accessControlState, caller, #user) or Authorization.hasPermission(accessControlState, caller, #admin);
  };

  func isUserActive(caller : Principal) : Bool {
    if (isDefaultAdminByPrincipal(caller)) {
      return true;
    };
    if (isAdminRole(caller)) {
      return true;
    };
    if (Authorization.isAdmin(accessControlState, caller)) {
      return true;
    };
    switch (userProfiles.get(caller)) {
      case (null) { false };
      case (?profile) { profile.active };
    };
  };

  func requireAdmin(caller : Principal) : () {
    if (isDefaultAdminByPrincipal(caller)) {
      return;
    };
    if (isAdminRole(caller)) {
      return;
    };
    if (Authorization.isAdmin(accessControlState, caller)) {
      return;
    };
    Runtime.trap("Unauthorized: Only admins can perform this action");
  };

  func requireAuthenticated(caller : Principal) : () {
    if (isDefaultAdminByPrincipal(caller)) {
      return;
    };
    if (isAdminRole(caller)) {
      return;
    };
    if (Authorization.isAdmin(accessControlState, caller)) {
      return;
    };
    if (not isAuthenticatedUser(caller)) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    if (not isUserActive(caller)) {
      Runtime.trap("Your account is not active. Please contact the administrator.");
    };
  };

  func requireAdminOrMasterAdmin(caller : Principal) : () {
    if (isDefaultAdminByPrincipal(caller)) {
      return;
    };
    if (isAdminRole(caller)) {
      return;
    };
    if (Authorization.isAdmin(accessControlState, caller)) {
      return;
    };
    Runtime.trap("Unauthorized: Only admins can access this module");
  };

  func validateAdminPassword(password : Text) : () {
    switch (adminPasswordData) {
      case (null) {
        Runtime.trap("Admin password not initialized");
      };
      case (?data) {
        if (not Text.equal(data.password, password)) {
          Runtime.trap("Invalid password");
        };
      };
    };
  };

  func generateUniquePrincipal() : Principal {
    userPrincipalCounter += 1;
    let timestamp = Time.now();
    let counterBytes = Nat8.fromNat(userPrincipalCounter % 256);
    let timestampText = timestamp.toText();

    let seedText = "user-" # userPrincipalCounter.toText() # "-" # timestampText;
    let seedBytes = seedText.encodeUtf8().toArray();

    let principalBytes = Array.tabulate(29, func(i) {
      if (i < seedBytes.size()) {
        seedBytes[i];
      } else {
        counterBytes;
      };
    });

    Blob.fromArray(principalBytes).fromBlob();
  };

  func ensureDefaultAdmin() : () {
    switch (findPrincipalByEmail(DEFAULT_ADMIN_EMAIL)) {
      case (null) {
        let defaultAdminProfile : UserProfile = {
          fullName = DEFAULT_ADMIN_NAME;
          contact = DEFAULT_ADMIN_CONTACT;
          email = DEFAULT_ADMIN_EMAIL;
          role = #admin;
          active = true;
          accessProjects = [];
        };

        let adminPrincipal = switch (defaultAdminPrincipal) {
          case (null) {
            let newPrincipal = Principal.fromText("2vxsx-fae");
            defaultAdminPrincipal := ?newPrincipal;
            newPrincipal;
          };
          case (?existing) { existing };
        };

        userProfiles.add(adminPrincipal, defaultAdminProfile);
        
        if (not isInitialized) {
          Authorization.initialize(accessControlState, adminPrincipal);
        };
      };
      case (?existingPrincipal) {
        defaultAdminPrincipal := ?existingPrincipal;
        
        if (not isInitialized) {
          Authorization.initialize(accessControlState, existingPrincipal);
        };
      };
    };
  };

  func removeDuplicateAdmins() : () {
    var firstAdminPrincipal : ?Principal = null;
    let duplicatePrincipals = List.empty<Principal>();

    for ((principal, profile) in userProfiles.entries()) {
      if (Text.equal(profile.email, DEFAULT_ADMIN_EMAIL)) {
        switch (firstAdminPrincipal) {
          case (null) {
            firstAdminPrincipal := ?principal;
          };
          case (?_) {
            duplicatePrincipals.add(principal);
          };
        };
      };
    };

    for (duplicatePrincipal in duplicatePrincipals.values()) {
      userProfiles.remove(duplicatePrincipal);
    };

    switch (firstAdminPrincipal) {
      case (null) {};
      case (?adminPrincipal) {
        let correctedProfile : UserProfile = {
          fullName = DEFAULT_ADMIN_NAME;
          contact = "+91 " # DEFAULT_ADMIN_CONTACT;
          email = DEFAULT_ADMIN_EMAIL;
          role = #admin;
          active = true;
          accessProjects = [];
        };
        userProfiles.add(adminPrincipal, correctedProfile);
        defaultAdminPrincipal := ?adminPrincipal;
      };
    };
  };

  func getUserAccessProjects(caller : Principal) : [Text] {
    if (isDefaultAdminByPrincipal(caller)) {
      return [];
    };
    if (isAdminRole(caller)) {
      return [];
    };
    if (Authorization.isAdmin(accessControlState, caller)) {
      return [];
    };
    switch (userProfiles.get(caller)) {
      case (null) { [] };
      case (?profile) { profile.accessProjects };
    };
  };

  func hasProjectAccess(caller : Principal, projectId : Text) : Bool {
    if (isDefaultAdminByPrincipal(caller)) {
      return true;
    };
    if (isAdminRole(caller)) {
      return true;
    };
    if (Authorization.isAdmin(accessControlState, caller)) {
      return true;
    };

    let accessProjects = getUserAccessProjects(caller);
    if (accessProjects.size() == 0) {
      return true;
    };

    accessProjects.find<Text>(func(pid) { Text.equal(pid, projectId) }) != null;
  };

  func filterProjectsByAccess(caller : Principal, projectsList : [Project]) : [Project] {
    if (isDefaultAdminByPrincipal(caller)) {
      return projectsList;
    };
    if (isAdminRole(caller)) {
      return projectsList;
    };
    if (Authorization.isAdmin(accessControlState, caller)) {
      return projectsList;
    };

    let accessProjects = getUserAccessProjects(caller);
    if (accessProjects.size() == 0) {
      return projectsList;
    };

    projectsList.filter<Project>(func(project) {
      accessProjects.find<Text>(func(pid) { Text.equal(pid, project.id) }) != null;
    });
  };

  func filterBillsByAccess(caller : Principal, billsList : [Bill]) : [Bill] {
    if (isDefaultAdminByPrincipal(caller)) {
      return billsList;
    };
    if (isAdminRole(caller)) {
      return billsList;
    };
    if (Authorization.isAdmin(accessControlState, caller)) {
      return billsList;
    };

    let accessProjects = getUserAccessProjects(caller);
    if (accessProjects.size() == 0) {
      return billsList;
    };

    billsList.filter<Bill>(func(bill) {
      accessProjects.find<Text>(func(pid) { Text.equal(pid, bill.projectId) }) != null;
    });
  };

  func filterPaymentsByAccess(caller : Principal, paymentsList : [Payment]) : [Payment] {
    if (isDefaultAdminByPrincipal(caller)) {
      return paymentsList;
    };
    if (isAdminRole(caller)) {
      return paymentsList;
    };
    if (Authorization.isAdmin(accessControlState, caller)) {
      return paymentsList;
    };

    let accessProjects = getUserAccessProjects(caller);
    if (accessProjects.size() == 0) {
      return paymentsList;
    };

    paymentsList.filter<Payment>(func(payment) {
      accessProjects.find<Text>(func(pid) { Text.equal(pid, payment.projectId) }) != null;
    });
  };

  system func preupgrade() {
  };

  system func postupgrade() {
    // Always ensure default admin exists after every upgrade
    ensureDefaultAdmin();
    removeDuplicateAdmins();
    isInitialized := true;
  };

  public shared ({ caller }) func initializeAccessControl() : async () {
    if (not isInitialized) {
      ensureDefaultAdmin();
      removeDuplicateAdmins();
      isInitialized := true;
    };
  };

  public query ({ caller }) func getCallerUserRole() : async UserRole {
    if (isDefaultAdminByPrincipal(caller)) {
      return #admin;
    };
    if (isAdminRole(caller)) {
      return #admin;
    };
    Authorization.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : UserRole) : async () {
    requireAdmin(caller);
    Authorization.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    if (isDefaultAdminByPrincipal(caller)) {
      return true;
    };
    if (isAdminRole(caller)) {
      return true;
    };
    Authorization.isAdmin(accessControlState, caller);
  };

  public query ({ caller }) func getDefaultAdminProfile() : async ?UserProfile {
    switch (findPrincipalByEmail(DEFAULT_ADMIN_EMAIL)) {
      case (null) { null };
      case (?principal) { userProfiles.get(principal) };
    };
  };

  public query ({ caller }) func hasActiveProfile(email : Text) : async Bool {
    if (isDefaultAdmin(email)) {
      return true;
    };

    if (userProfiles.isEmpty()) {
      return false;
    };

    for ((_, profile) in userProfiles.entries()) {
      if (profile.active and Text.equal(profile.email, email)) {
        return true;
      };
    };
    return false;
  };

  public query ({ caller }) func validateActiveUser(email : Text) : async () {
    if (isDefaultAdmin(email)) {
      return;
    };

    var foundProfile : ?UserProfile = null;
    var hasAnyUsers = false;

    for ((_, profile) in userProfiles.entries()) {
      hasAnyUsers := true;
      if (Text.equal(profile.email, email)) {
        foundProfile := ?profile;
      };
    };

    if (not hasAnyUsers) {
      Runtime.trap("User profile not found and no active users exist");
    };

    switch (foundProfile) {
      case (null) {
        Runtime.trap("Your account is not active. Please contact the administrator.");
      };
      case (?profile) {
        if (not profile.active) {
          Runtime.trap("Your account is not active. Please contact the administrator.");
        };
      };
    };
  };

  public query ({ caller }) func hasProfileSetup() : async Bool {
    if (caller.isAnonymous()) {
      return false;
    };

    switch (userProfiles.get(caller)) {
      case (null) { false };
      case (?_) { true };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (caller.isAnonymous()) {
      return null;
    };

    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };

    if (isDefaultAdminByPrincipal(caller)) {
      return userProfiles.get(user);
    };
    if (isAdminRole(caller)) {
      return userProfiles.get(user);
    };
    if (Authorization.isAdmin(accessControlState, caller)) {
      return userProfiles.get(user);
    };

    if (caller != user) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot save profiles");
    };

    userProfiles.add(caller, profile);

    if (not isInitialized) {
      ensureDefaultAdmin();
      removeDuplicateAdmins();
      isInitialized := true;
    };
  };

  public shared ({ caller }) func linkMasterAdminPrincipal() : async Bool {
    // Reject anonymous callers
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot link profiles");
    };

    // Check if caller already has a profile
    switch (userProfiles.get(caller)) {
      case (?_) {
        // Caller already has a profile, no linking needed
        return false;
      };
      case (null) {
        // Caller has no profile, check for placeholder admin
        let placeholderPrincipal = Principal.fromText("2vxsx-fae");
        
        switch (userProfiles.get(placeholderPrincipal)) {
          case (null) {
            // No placeholder profile exists
            return false;
          };
          case (?placeholderProfile) {
            // Check if this is the master admin profile
            if (Text.equal(placeholderProfile.email, DEFAULT_ADMIN_EMAIL)) {
              // Remove from placeholder principal
              userProfiles.remove(placeholderPrincipal);
              
              // Add under real caller principal
              userProfiles.add(caller, placeholderProfile);
              
              // Update defaultAdminPrincipal
              defaultAdminPrincipal := ?caller;
              
              return true;
            } else {
              // Placeholder exists but not for master admin
              return false;
            };
          };
        };
      };
    };
  };
  // Links a user account to their real Internet Identity principal by email.
  // Called when a user logs in but no profile is found under their II principal.
  // Finds the profile stored under an admin-generated PID and remaps it to the caller.
  public shared ({ caller }) func linkUserByEmail(email : Text) : async Bool {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot link profiles");
    };

    // If caller already has a profile, no linking needed
    switch (userProfiles.get(caller)) {
      case (?existing) {
        return Text.equal(existing.email, email);
      };
      case (null) {};
    };

    // Search all profiles for one matching the given email
    for ((principal, profile) in userProfiles.entries()) {
      if (Text.equal(profile.email, email)) {
        if (principal != caller) {
          userProfiles.remove(principal);
          userProfiles.add(caller, profile);
          return true;
        };
      };
    };

    return false;
  };


  public shared ({ caller }) func addUser(profile : UserProfile) : async Principal {
    requireAdminOrMasterAdmin(caller);

    for ((_, existingProfile) in userProfiles.entries()) {
      if (Text.equal(existingProfile.email, profile.email)) {
        Runtime.trap("User with this email already exists");
      };
    };

    let newPrincipal = generateUniquePrincipal();
    userProfiles.add(newPrincipal, profile);

    removeDuplicateAdmins();

    newPrincipal;
  };

  public query ({ caller }) func listUsers() : async [(Principal, UserProfile)] {
    requireAdminOrMasterAdmin(caller);

    userProfiles.entries().toArray();
  };

  public shared ({ caller }) func updateUser(userPrincipal : Principal, profile : UserProfile) : async () {
    requireAdminOrMasterAdmin(caller);

    switch (userProfiles.get(userPrincipal)) {
      case (null) {
        Runtime.trap("User not found");
      };
      case (?existingProfile) {
        if (isDefaultAdmin(existingProfile.email)) {
          Runtime.trap("Cannot modify default admin user");
        };

        for ((otherPrincipal, otherProfile) in userProfiles.entries()) {
          if (otherPrincipal != userPrincipal and Text.equal(otherProfile.email, profile.email)) {
            Runtime.trap("Email already in use by another user");
          };
        };

        userProfiles.add(userPrincipal, profile);
      };
    };
    removeDuplicateAdmins();
  };

  public shared ({ caller }) func deleteUsers(password : Text, principalIds : [Text]) : async () {
    requireAdminOrMasterAdmin(caller);
    validateAdminPassword(password);

    for (principalIdText in principalIds.vals()) {
      let principalId = Principal.fromText(principalIdText);

      switch (userProfiles.get(principalId)) {
        case (null) {};
        case (?profile) {
          if (not isDefaultAdmin(profile.email)) {
            userProfiles.remove(principalId);
          };
        };
      };
    };

    removeDuplicateAdmins();
  };

  public query ({ caller }) func isAdminPasswordSet() : async Bool {
    requireAuthenticated(caller);

    switch (adminPasswordData) {
      case (null) { false };
      case (?_) { true };
    };
  };

  public query ({ caller }) func getHintQuestion() : async ?Text {
    requireAuthenticated(caller);

    switch (adminPasswordData) {
      case (null) { null };
      case (?data) { data.hintQuestion };
    };
  };

  public shared ({ caller }) func setHintQuestionAndAnswer(question : Text, answer : Text) : async () {
    requireAdmin(caller);

    switch (adminPasswordData) {
      case (null) {
        Runtime.trap("Admin password not initialized");
      };
      case (?data) {
        adminPasswordData := ?{
          password = data.password;
          hintQuestion = ?question;
          hintAnswer = ?answer;
        };
      };
    };
  };

  public shared ({ caller }) func verifyHintAnswer(answer : Text) : async Text {
    requireAdmin(caller);

    switch (adminPasswordData) {
      case (null) {
        Runtime.trap("Admin password not initialized");
      };
      case (?data) {
        switch (data.hintAnswer) {
          case (null) {
            Runtime.trap("Hint answer not set");
          };
          case (?storedAnswer) {
            if (Text.equal(storedAnswer, answer)) {
              return data.password;
            } else {
              Runtime.trap("Incorrect answer. Password cannot be shown.");
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func addProject(project : Project) : async () {
    requireAdmin(caller);

    if (projects.containsKey(project.id)) {
      Runtime.trap("Project ID already exists");
    };
    projects.add(project.id, project);
  };

  public shared ({ caller }) func updateProject(project : Project, password : Text) : async () {
    requireAdmin(caller);
    validateAdminPassword(password);

    switch (projects.get(project.id)) {
      case (null) { Runtime.trap("Project not found") };
      case (_) { projects.add(project.id, project) };
    };
  };

  public shared ({ caller }) func deleteProject(id : Text, password : Text) : async () {
    requireAdmin(caller);
    validateAdminPassword(password);

    projects.remove(id);
  };

  public query ({ caller }) func getAllProjects() : async [Project] {
    requireAuthenticated(caller);
    let allProjects = projects.values().toArray();
    filterProjectsByAccess(caller, allProjects);
  };

  public query ({ caller }) func filterProjects(filters : ProjectFilters) : async [Project] {
    requireAuthenticated(caller);

    let filteredProjects = List.empty<Project>();

    for ((_, project) in projects.entries()) {
      if (hasProjectAccess(caller, project.id)) {
        let matchesSearch = switch (filters.search) {
          case (null) { true };
          case (?search) {
            let searchLower = search.toLower();
            let nameMatches = project.name.toLower().contains(#text (searchLower));
            let clientMatches = project.client.toLower().contains(#text (searchLower));
            let locationMatches = project.location.toLower().contains(#text (searchLower));
            let contactMatches = project.contactNumber.contains(#text (searchLower));
            nameMatches or clientMatches or locationMatches or contactMatches;
          };
        };

        let matchesClient = switch (filters.client) {
          case (null) { true };
          case (?client) {
            project.client.toLower().contains(#text (client.toLower()));
          };
        };

        let matchesMinPrice = switch (filters.minUnitPrice) {
          case (null) { true };
          case (?minPrice) { project.unitPrice >= minPrice };
        };

        let matchesMaxPrice = switch (filters.maxUnitPrice) {
          case (null) { true };
          case (?maxPrice) { project.unitPrice <= maxPrice };
        };

        if (matchesSearch and matchesClient and matchesMinPrice and matchesMaxPrice) {
          filteredProjects.add(project);
        };
      };
    };

    filteredProjects.toArray();
  };

  public shared ({ caller }) func addBill(bill : Bill) : async () {
    requireAdmin(caller);

    let key = {
      projectId = bill.projectId;
      billNumber = bill.billNumber;
    };

    switch (bills.get(key)) {
      case (null) {
        bills.add(key, bill);
      };
      case (?_) {
        Runtime.trap("This bill number already entered in this project.");
      };
    };
  };

  public shared ({ caller }) func updateBill(bill : Bill, password : Text) : async () {
    requireAdmin(caller);
    validateAdminPassword(password);

    let key = {
      projectId = bill.projectId;
      billNumber = bill.billNumber;
    };

    switch (bills.get(key)) {
      case (null) {
        Runtime.trap("Bill not found");
      };
      case (?_) {
        bills.add(key, bill);
      };
    };
  };

  public shared ({ caller }) func deleteBill(projectId : Text, billNumber : Text, password : Text) : async () {
    requireAdmin(caller);
    validateAdminPassword(password);

    let key = {
      projectId;
      billNumber;
    };
    bills.remove(key);
  };

  public query ({ caller }) func getAllBills() : async [Bill] {
    requireAuthenticated(caller);
    let allBills = bills.values().toArray();
    filterBillsByAccess(caller, allBills);
  };

  public query ({ caller }) func getBillDetails(projectId : Text, billNumber : Text) : async ?Bill {
    requireAuthenticated(caller);

    let key = {
      projectId;
      billNumber;
    };

    switch (bills.get(key)) {
      case (null) { null };
      case (?bill) {
        if (hasProjectAccess(caller, bill.projectId)) {
          ?bill;
        } else {
          null;
        };
      };
    };
  };

  public query ({ caller }) func filterBills(billFilters : BillFilters) : async [Bill] {
    requireAuthenticated(caller);

    let filteredBills = List.empty<Bill>();

    for ((_, bill) in bills.entries()) {
      if (hasProjectAccess(caller, bill.projectId)) {
        let matchesSearch = switch (billFilters.search) {
          case (null) { true };
          case (?search) {
            let searchLower = bill.description.toLower();
            let descMatches = bill.description.toLower().contains(#text (searchLower));
            let projectMatches = switch (billFilters.projectId) {
              case (null) { false };
              case (?projectId) { bill.projectId == projectId };
            };
            let minAmountOk = switch (billFilters.minAmount) {
              case (null) { true };
              case (?min) { bill.amount >= min };
            };
            let maxAmountOk = switch (billFilters.maxAmount) {
              case (null) { true };
              case (?max) { bill.amount <= max };
            };
            descMatches or projectMatches or (minAmountOk and maxAmountOk);
          };
        };

        let matchesBlock = switch (billFilters.blockId) {
          case (null) { true };
          case (?block) {
            switch (bill.blockId) {
              case (null) { false };
              case (?id) { id.contains(#text block) };
            };
          };
        };

        let matchesBillNumber = switch (billFilters.billNumber) {
          case (null) { true };
          case (?billNum) {
            Text.equal(bill.billNumber, billNum);
          };
        };

        let matchesClient = switch (billFilters.client) {
          case (null) { true };
          case (?clientName) {
            switch (projects.get(bill.projectId)) {
              case (null) { false };
              case (?project) {
                project.client.toLower().contains(#text (clientName.toLower()));
              };
            };
          };
        };

        let matchesGst = switch (billFilters.includesGst) {
          case (null) { true };
          case (?gst) { bill.includesGst == gst };
        };

        let matchesMaxAmount = switch (billFilters.maxAmount) {
          case (null) { true };
          case (?maxAmount) { bill.amount <= maxAmount };
        };

        let matchesMinAmount = switch (billFilters.minAmount) {
          case (null) { true };
          case (?minAmount) { bill.amount >= minAmount };
        };

        if (matchesSearch and matchesBlock and matchesBillNumber and matchesClient and matchesGst and matchesMaxAmount and matchesMinAmount) {
          filteredBills.add(bill);
        };
      };
    };

    filteredBills.toArray();
  };

  public query ({ caller }) func filterBillsByProject(projectId : Text) : async [Bill] {
    requireAuthenticated(caller);

    if (not hasProjectAccess(caller, projectId)) {
      return [];
    };

    bills.values().toArray().filter(func(bill) { bill.projectId == projectId });
  };

  public query ({ caller }) func getSortedBills(
    sortBy : ?Text,
    ascending : Bool
  ) : async [Bill] {
    requireAuthenticated(caller);

    let allBills = bills.values().toArray();
    let accessibleBills = filterBillsByAccess(caller, allBills);

    let sortedArray = switch (sortBy) {
      case (null) { accessibleBills };
      case (?sortKey) {
        switch (sortKey) {
          case ("projectName") {
            accessibleBills.sort(
              func(a, b) {
                let comparison = Text.compare(a.projectId, b.projectId);
                if (ascending) { comparison } else {
                  switch (comparison) {
                    case (#less) { #greater };
                    case (#greater) { #less };
                    case (#equal) { #equal };
                  };
                };
              }
            );
          };
          case ("billNumber") {
            accessibleBills.sort(
              func(a, b) {
                let comparison = Text.compare(a.billNumber, b.billNumber);
                if (ascending) { comparison } else {
                  switch (comparison) {
                    case (#less) { #greater };
                    case (#greater) { #less };
                    case (#equal) { #equal };
                  };
                };
              }
            );
          };
          case ("date") {
            accessibleBills.sort(
              func(a, b) {
                let comparison = Text.compare(a.date, b.date);
                if (ascending) { comparison } else {
                  switch (comparison) {
                    case (#less) { #greater };
                    case (#greater) { #less };
                    case (#equal) { #equal };
                  };
                };
              }
            );
          };
          case ("amount") {
            accessibleBills.sort(
              func(a, b) {
                let comparison = Float.compare(a.amount, b.amount);
                if (ascending) { comparison } else {
                  switch (comparison) {
                    case (#less) { #greater };
                    case (#greater) { #less };
                    case (#equal) { #equal };
                  };
                };
              }
            );
          };
          case (_) { accessibleBills };
        };
      };
    };

    sortedArray;
  };

  public shared ({ caller }) func bulkDeleteBillsWithPassword(password : Text, billKeys : [BillKey]) : async () {
    requireAdmin(caller);
    validateAdminPassword(password);

    for (billKey in billKeys.values()) {
      bills.remove(billKey);
    };
  };

  public shared ({ caller }) func addPayment(payment : Payment) : async () {
    requireAdmin(caller);

    if (payments.containsKey(payment.id)) {
      Runtime.trap("Payment ID already exists");
    };
    payments.add(payment.id, payment);
  };

  public shared ({ caller }) func updatePayment(payment : Payment, password : Text) : async () {
    requireAdmin(caller);
    validateAdminPassword(password);

    switch (payments.get(payment.id)) {
      case (null) { Runtime.trap("Payment not found") };
      case (_) { payments.add(payment.id, payment) };
    };
  };

  public shared ({ caller }) func deletePayment(id : Text, password : Text) : async () {
    requireAdmin(caller);
    validateAdminPassword(password);

    payments.remove(id);
  };

  public shared ({ caller }) func bulkDeletePayments(password : Text, ids : [Text]) : async () {
    requireAdmin(caller);
    validateAdminPassword(password);

    for (id in ids.values()) {
      payments.remove(id);
    };
  };

  public query ({ caller }) func getAllPayments() : async [Payment] {
    requireAuthenticated(caller);
    let allPayments = payments.values().toArray();
    filterPaymentsByAccess(caller, allPayments);
  };

  public query ({ caller }) func getPaymentDetails(paymentId : Text) : async ?Payment {
    requireAuthenticated(caller);

    switch (payments.get(paymentId)) {
      case (null) { null };
      case (?payment) {
        if (hasProjectAccess(caller, payment.projectId)) {
          ?payment;
        } else {
          null;
        };
      };
    };
  };

  public query ({ caller }) func filterPayments(filters : PaymentFilters) : async [Payment] {
    requireAuthenticated(caller);

    let filteredPayments = List.empty<Payment>();

    for ((_, payment) in payments.entries()) {
      if (hasProjectAccess(caller, payment.projectId)) {
        let matchesSearch = switch (filters.search) {
          case (null) { true };
          case (?search) {
            let searchLower = payment.reference.toLower();
            let referenceMatches = searchLower.contains(#text (search.toLower()));
            let minAmountOk = switch (filters.minAmount) {
              case (null) { true };
              case (?min) { payment.amount >= min };
            };
            let maxAmountOk = switch (filters.maxAmount) {
              case (null) { true };
              case (?max) { payment.amount <= max };
            };
            referenceMatches or (minAmountOk and maxAmountOk);
          };
        };

        let matchesProject = switch (filters.projectId) {
          case (null) { true };
          case (?projectId) { payment.projectId == projectId };
        };

        let matchesPaymentMode = switch (filters.paymentMode) {
          case (null) { true };
          case (?paymentMode) { payment.paymentMode == paymentMode };
        };

        let matchesReference = switch (filters.reference) {
          case (null) { true };
          case (?reference) { Text.equal(payment.reference, reference) };
        };

        let matchesMinAmount = switch (filters.minAmount) {
          case (null) { true };
          case (?minAmount) { payment.amount >= minAmount };
        };

        let matchesMaxAmount = switch (filters.maxAmount) {
          case (null) { true };
          case (?maxAmount) { payment.amount <= maxAmount };
        };

        let matchesAmountRange = switch (filters.minAmount, filters.maxAmount) {
          case (?minAmount, ?maxAmount) {
            matchesMinAmount and matchesMaxAmount and payment.amount >= minAmount and payment.amount <= maxAmount;
          };
          case (?minAmount, null) { matchesMinAmount and payment.amount >= minAmount };
          case (null, ?maxAmount) { matchesMaxAmount and payment.amount <= maxAmount };
          case (null, null) { true };
        };

        if (matchesSearch and matchesProject and matchesPaymentMode and matchesReference and matchesAmountRange) {
          filteredPayments.add(payment);
        };
      };
    };

    filteredPayments.toArray();
  };

  public shared ({ caller }) func addClient(client : Client) : async () {
    requireAdmin(caller);

    if (clients.containsKey(client.id)) {
      Runtime.trap("Client ID already exists");
    };
    clients.add(client.id, client);
  };

  public shared ({ caller }) func updateClient(client : Client, password : Text) : async () {
    requireAdmin(caller);
    validateAdminPassword(password);

    switch (clients.get(client.id)) {
      case (null) { Runtime.trap("Client not found") };
      case (_) { clients.add(client.id, client) };
    };
  };

  public shared ({ caller }) func deleteClient(id : Text, password : Text) : async () {
    requireAdmin(caller);
    validateAdminPassword(password);

    clients.remove(id);
  };

  public query ({ caller }) func getAllClients() : async [Client] {
    requireAuthenticated(caller);
    clients.values().toArray();
  };

  type DashboardMetrics = {
    totalBills : Float;
    totalPayments : Float;
    outstanding : Float;
    totalGst : Float;
  };

  type ProjectAnalyticsData = {
    id : Text;
    name : Text;
    outstandingAmount : Float;
  };

  public query ({ caller }) func getProjectWiseAnalyticsData(sortBy : Text) : async [ProjectAnalyticsData] {
    requireAuthenticated(caller);

    let allProjects = projects.values().toArray();
    let accessibleProjects = filterProjectsByAccess(caller, allProjects);

    let sortedArray = switch (sortBy) {
      case ("outstanding") {
        accessibleProjects.sort(
          func(a, b) {
            Project.compareByOutstandingAndName(a, b, true, bills, payments);
          }
        );
      };
      case ("name") {
        accessibleProjects.sort(
          func(a, b) {
            Text.compare(a.name, b.name);
          }
        );
      };
      case (_) { accessibleProjects };
    };

    sortedArray.map(func(project) { { id = project.id; name = project.name; outstandingAmount = calculateOutstanding(project.id); } });
  };

  func calculateOutstanding(projectId : Text) : Float {
    var totalBills = 0.0;
    var totalPayments = 0.0;

    for ((_, bill) in bills.entries()) {
      if (bill.projectId == projectId) {
        totalBills += bill.amount;
      };
    };

    for ((_, payment) in payments.entries()) {
      if (payment.projectId == projectId) {
        totalPayments += payment.amount;
      };
    };

    totalBills - totalPayments;
  };

  public query ({ caller }) func getDashboardMetrics() : async DashboardMetrics {
    requireAuthenticated(caller);

    let allBills = bills.values().toArray();
    let accessibleBills = filterBillsByAccess(caller, allBills);

    let allPayments = payments.values().toArray();
    let accessiblePayments = filterPaymentsByAccess(caller, allPayments);

    let billsTotal = accessibleBills.values().foldLeft(0.0, func(total, bill) { total + bill.amount });
    let paymentsTotal = accessiblePayments.values().foldLeft(0.0, func(total, payment) { total + payment.amount });

    let outstanding = billsTotal - paymentsTotal;

    {
      totalBills = billsTotal;
      totalPayments = paymentsTotal;
      outstanding;
      totalGst = outstanding * 0.18;
    };
  };

  public query ({ caller }) func getOutstandingAmount() : async Float {
    requireAuthenticated(caller);

    let allBills = bills.values().toArray();
    let accessibleBills = filterBillsByAccess(caller, allBills);

    let allPayments = payments.values().toArray();
    let accessiblePayments = filterPaymentsByAccess(caller, allPayments);

    let billsTotal = accessibleBills.values().foldLeft(0.0, func(total, bill) { total + bill.amount });
    let paymentsTotal = accessiblePayments.values().foldLeft(0.0, func(total, payment) { total + payment.amount });
    billsTotal - paymentsTotal;
  };

  let gstRatePercent : Nat = 18;

  public query ({ caller }) func getTotalGst() : async Float {
    requireAuthenticated(caller);

    let allBills = bills.values().toArray();
    let accessibleBills = filterBillsByAccess(caller, allBills);

    let billsTotal = accessibleBills.values().foldLeft(0.0, func(total, bill) { total + bill.amount });
    (billsTotal * gstRatePercent.toFloat()) / 100.0;
  };

  type ImportRequest = {
    projectsData : [Project];
    billsData : [Bill];
    paymentsData : [Payment];
    clientsData : [Client];
    usersData : [(Principal, UserProfile)];
  };

  public shared ({ caller }) func importData(request : ImportRequest, password : Text) : async () {
    requireAdmin(caller);
    validateAdminPassword(password);

    for (project in request.projectsData.values()) {
      projects.add(project.id, project);
    };

    for (bill in request.billsData.values()) {
      let key = {
        projectId = bill.projectId;
        billNumber = bill.billNumber;
      };

      switch (bills.get(key)) {
        case (null) {
          bills.add(key, bill);
        };
        case (?_) {};
      };
    };

    for (payment in request.paymentsData.values()) {
      payments.add(payment.id, payment);
    };

    for (client in request.clientsData.values()) {
      clients.add(client.id, client);
    };

    for ((principal, userProfile) in request.usersData.values()) {
      var emailExists = false;
      for ((otherPrincipal, otherProfile) in userProfiles.entries()) {
        if (otherPrincipal != principal and Text.equal(otherProfile.email, userProfile.email)) {
          emailExists := true;
        };
      };

      var contactExists = false;
      for ((otherPrincipal, otherProfile) in userProfiles.entries()) {
        if (otherPrincipal != principal and Text.equal(otherProfile.contact, userProfile.contact)) {
          contactExists := true;
        };
      };

      if (not emailExists and not contactExists) {
        userProfiles.add(principal, userProfile);
      };
    };
    ensureDefaultAdmin();
    removeDuplicateAdmins();
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public query ({ caller }) func getGreetingMessage(_ : ()) : async Text {
    requireAuthenticated(caller);

    let currentTimeMillis = Time.now();
    let istTimeMillis = (currentTimeMillis + (5 * 3600000000000) + (30 * 60000000000)) % (24 * 3600000000000);

    let baseGreeting = if (istTimeMillis >= (5 * 3600000000000) and istTimeMillis < (12 * 3600000000000)) {
      "Good Morning";
    } else if (istTimeMillis >= (12 * 3600000000000) and istTimeMillis < (17 * 3600000000000)) {
      "Good Afternoon";
    } else if (istTimeMillis >= (17 * 3600000000000) and istTimeMillis < (22 * 3600000000000)) {
      "Good Evening";
    } else {
      "Good Night";
    };

    switch (userProfiles.get(caller)) {
      case (null) {
        "Hello 👋\n\nI'm Seri AI 👋\nI can help you with Projects, Bills, Payments, Outstanding, GST, Reports, and Analytics.\nWhat would you like to know?";
      };
      case (?profile) {
        let timeEmoji = if (istTimeMillis >= (5 * 3600000000000) and istTimeMillis < (12 * 3600000000000)) {
          "☀️";
        } else if (istTimeMillis >= (12 * 3600000000000) and istTimeMillis < (17 * 3600000000000)) {
          "🌤️";
        } else if (istTimeMillis >= (17 * 3600000000000) and istTimeMillis < (22 * 3600000000000)) {
          "🌆";
        } else {
          "🌙";
        };

        baseGreeting # ", " # profile.fullName # " " # timeEmoji # "\n\nI'm Seri AI 👋\nI can help you with Projects, Bills, Payments, Outstanding, GST, Reports, and Analytics.\nWhat would you like to know?";
      };
    };
  };

  public query ({ caller }) func getAllProjectNames() : async [Text] {
    requireAuthenticated(caller);
    let allProjects = projects.values().toArray();
    let accessibleProjects = filterProjectsByAccess(caller, allProjects);
    accessibleProjects.map(func(p) { p.name });
  };

  public query ({ caller }) func getProjectSummary(projectId : Text) : async ?{
    project : Project;
    totalBills : Float;
    totalPayments : Float;
    accountPayments : Float;
    cashPayments : Float;
    outstanding : Float;
    gstOutstanding : Float;
  } {
    requireAuthenticated(caller);

    if (not hasProjectAccess(caller, projectId)) {
      return null;
    };

    switch (projects.get(projectId)) {
      case (null) { null };
      case (?project) {
        var totalBills = 0.0;
        var totalPayments = 0.0;
        var accountPayments = 0.0;
        var cashPayments = 0.0;

        for ((_, bill) in bills.entries()) {
          if (bill.projectId == projectId) {
            totalBills += bill.amount;
          };
        };

        for ((_, payment) in payments.entries()) {
          if (payment.projectId == projectId) {
            totalPayments += payment.amount;
            switch (payment.paymentMode) {
              case (#account) { accountPayments += payment.amount };
              case (#cash) { cashPayments += payment.amount };
            };
          };
        };

        let outstanding = totalBills - totalPayments;
        let gstOutstanding = if (outstanding > 0.0) { outstanding * 0.18 } else {
          0.0;
        };

        ?{
          project;
          totalBills;
          totalPayments;
          accountPayments;
          cashPayments;
          outstanding;
          gstOutstanding;
        };
      };
    };
  };

  public query ({ caller }) func getUserAccess(email : Text) : async [Text] {
    requireAuthenticated(caller);

    if (isDefaultAdmin(email)) {
      return [];
    };

    if (isDefaultAdminByPrincipal(caller)) {
      switch (findPrincipalByEmail(email)) {
        case (null) { [] };
        case (?targetPrincipal) {
          switch (userProfiles.get(targetPrincipal)) {
            case (null) { [] };
            case (?profile) { profile.accessProjects };
          };
        };
      };
    } else if (isAdminRole(caller)) {
      switch (findPrincipalByEmail(email)) {
        case (null) { [] };
        case (?targetPrincipal) {
          switch (userProfiles.get(targetPrincipal)) {
            case (null) { [] };
            case (?profile) { profile.accessProjects };
          };
        };
      };
    } else if (Authorization.isAdmin(accessControlState, caller)) {
      switch (findPrincipalByEmail(email)) {
        case (null) { [] };
        case (?targetPrincipal) {
          switch (userProfiles.get(targetPrincipal)) {
            case (null) { [] };
            case (?profile) { profile.accessProjects };
          };
        };
      };
    } else {
      switch (findPrincipalByEmail(email)) {
        case (null) { [] };
        case (?targetPrincipal) {
          let isOwnProfile = caller == targetPrincipal;

          if (not isOwnProfile) {
            Runtime.trap("Unauthorized: Can only view your own project access");
          };

          switch (userProfiles.get(targetPrincipal)) {
            case (null) { [] };
            case (?profile) { profile.accessProjects };
          };
        };
      };
    };
  };

  public query ({ caller }) func getAdminPasswordQuestion() : async ?Text {
    requireAdmin(caller);

    switch (adminPasswordData) {
      case (null) { null };
      case (?data) { data.hintQuestion };
    };
  };

  public shared ({ caller }) func revealAdminPassword(answer : Text) : async ?Text {
    requireAdmin(caller);

    switch (adminPasswordData) {
      case (null) {
        Runtime.trap("Admin password not initialized");
      };
      case (?data) {
        switch (data.hintAnswer) {
          case (null) {
            Runtime.trap("Hint answer not set");
          };
          case (?storedAnswer) {
            if (Text.equal(storedAnswer, answer)) {
              ?data.password;
            } else {
              Runtime.trap("Incorrect answer. Password cannot be shown.");
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func changeAdminPassword(
    adminEmail : Text,
    oldPwd : Text,
    newPwd : Text,
    confirmPwd : Text,
    newQuestion : Text,
    newAnswer : Text
  ) : async Bool {
    requireAdmin(caller);

    switch (adminPasswordData) {
      case (null) {
        Runtime.trap("Admin password not initialized");
      };
      case (?data) {
        if (not Text.equal(data.password, oldPwd)) {
          Runtime.trap("Incorrect old password.");
        };
        if (not Text.equal(newPwd, confirmPwd)) {
          Runtime.trap("New password and confirmation do not match.");
        };

        adminPasswordData := ?{
          password = newPwd;
          hintQuestion = ?newQuestion;
          hintAnswer = ?newAnswer;
        };
        true;
      };
    };
  };

  public shared ({ caller }) func toggleProjectCompleted(id : Text) : async () {
    requireAdmin(caller);
    switch (completedProjectIds.get(id)) {
      case (null) { completedProjectIds.add(id, true) };
      case (?_) { completedProjectIds.remove(id) };
    };
  };

  public query func getCompletedProjectIds() : async [Text] {
    completedProjectIds.keys().toArray();
  };

  public shared ({ caller }) func setProjectMapLocation(projectId : Text, location : Text) : async () {
    requireAdmin(caller);
    if (location == "") {
      projectMapLocations.remove(projectId);
    } else {
      projectMapLocations.add(projectId, location);
    };
  };

  public query ({ caller }) func getProjectMapLocations() : async [(Text, Text)] {
    requireAuthenticated(caller);
    projectMapLocations.entries().toArray();
  };
};
