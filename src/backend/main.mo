import AccessControl "authorization/access-control";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Float "mo:core/Float";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import OutCall "http-outcalls/outcall";
import Bool "mo:core/Bool";
import Int "mo:core/Int";
import Migration "migration";

(with migration = Migration.run)
actor {
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
        case (#equal) { Text.compare(k1.billNumber, k2.billNumber) };
      };
    };
  };

  type UserRole = AccessControl.UserRole;

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
    public func compareByOutstandingAndName(a : Project, b : Project, useOutstanding : Bool, billData : Map.Map<BillKey, Bill>, paymentData : Map.Map<Text, Payment>) : Order.Order {
      if (useOutstanding) {
        let outstandingA = calculateOutstanding(a.id, billData, paymentData);
        let outstandingB = calculateOutstanding(b.id, billData, paymentData);
        if (outstandingA != outstandingB) {
          return Float.compare(outstandingB, outstandingA);
        };
      };
      Text.compare(a.name, b.name);
    };

    // Helper function to calculate outstanding amount for a project
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

  let projects = Map.empty<Text, Project>();

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

  let bills = Map.empty<BillKey, Bill>();

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

  let payments = Map.empty<Text, Payment>();

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

  let clients = Map.empty<Text, Client>();

  type UserProfile = {
    fullName : Text;
    contact : Text;
    email : Text;
    role : UserRole;
    active : Bool;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

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

  type UserFilters = {
    name : ?Text;
    contact : ?Text;
    email : ?Text;
    role : ?UserRole;
  };

  let accessControlState = AccessControl.initState();

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func hasActiveProfile(email : Text) : async Bool {
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
    if (userProfiles.isEmpty()) {
      Runtime.trap("User profile not found and no active users exist");
    };

    var foundProfile : ?UserProfile = null;
    for ((_, profile) in userProfiles.entries()) {
      if (Text.equal(profile.email, email)) {
        foundProfile := ?profile;
      };
    };

    switch (foundProfile) {
      case (null) {
        var hasAnyActive = false;
        for ((_, profile) in userProfiles.entries()) {
          if (profile.active) {
            hasAnyActive := true;
          };
        };

        if (hasAnyActive) {
          Runtime.trap("Your email ID is not activated.");
        } else {
          Runtime.trap("User profile not found and no active users exist");
        };
      };
      case (?profile) {
        if (not profile.active) {
          Runtime.trap("Your email ID is not activated.");
        };
      };
    };
  };

  public query ({ caller }) func hasProfileSetup() : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    switch (userProfiles.get(caller)) {
      case (null) { false };
      case (?_) { true };
    };
  };

  public query ({ caller }) func getCallerUserRole() : async UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getAllUsers() : async [(Principal, UserProfile)] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view all users");
    };
    userProfiles.entries().toArray();
  };

  public query ({ caller }) func filterUsers(filters : UserFilters) : async [(Principal, UserProfile)] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can filter users");
    };

    let filteredUsers = List.empty<(Principal, UserProfile)>();

    for ((principal, profile) in userProfiles.entries()) {
      let matchesName = switch (filters.name) {
        case (null) { true };
        case (?name) {
          profile.fullName.toLower().contains(#text (name.toLower()));
        };
      };

      let matchesContact = switch (filters.contact) {
        case (null) { true };
        case (?contact) {
          profile.contact.contains(#text contact);
        };
      };

      let matchesEmail = switch (filters.email) {
        case (null) { true };
        case (?email) {
          profile.email.toLower().contains(#text (email.toLower()));
        };
      };

      let matchesRole = switch (filters.role) {
        case (null) { true };
        case (?role) { profile.role == role };
      };

      if (matchesName and matchesContact and matchesEmail and matchesRole) {
        filteredUsers.add((principal, profile));
      };
    };

    filteredUsers.toArray();
  };

  public shared ({ caller }) func addUser(user : Principal, profile : UserProfile) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add users");
    };

    if (userProfiles.containsKey(user)) {
      Runtime.trap("User already exists");
    };

    for ((_, existingProfile) in userProfiles.entries()) {
      if (Text.equal(existingProfile.email, profile.email)) {
        Runtime.trap("This email ID is already registered.");
      };
    };

    for ((_, existingProfile) in userProfiles.entries()) {
      if (Text.equal(existingProfile.contact, profile.contact)) {
        Runtime.trap("This mobile number is already registered.");
      };
    };

    userProfiles.add(user, profile);
    AccessControl.assignRole(accessControlState, caller, user, profile.role);
  };

  public shared ({ caller }) func updateUser(user : Principal, profile : UserProfile) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update users");
    };

    switch (userProfiles.get(user)) {
      case (null) { Runtime.trap("User not found") };
      case (?existingProfile) {
        if (existingProfile.email != profile.email) {
          for ((otherPrincipal, otherProfile) in userProfiles.entries()) {
            if (otherPrincipal != user and Text.equal(otherProfile.email, profile.email)) {
              Runtime.trap("This email ID is already registered.");
            };
          };
        };

        if (existingProfile.contact != profile.contact) {
          for ((otherPrincipal, otherProfile) in userProfiles.entries()) {
            if (otherPrincipal != user and Text.equal(otherProfile.contact, profile.contact)) {
              Runtime.trap("This mobile number is already registered.");
            };
          };
        };

        userProfiles.add(user, profile);
        if (existingProfile.role != profile.role) {
          AccessControl.assignRole(accessControlState, caller, user, profile.role);
        };
      };
    };
  };

  public shared ({ caller }) func deleteUser(user : Principal, password : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete users");
    };

    if (password != "3554") {
      Runtime.trap("Invalid password. User deletion not allowed.");
    };

    if (caller == user) {
      Runtime.trap("Cannot delete your own account");
    };

    switch (userProfiles.get(user)) {
      case (null) { Runtime.trap("User not found") };
      case (?_) {
        userProfiles.remove(user);
      };
    };
  };

  public shared ({ caller }) func toggleUserActiveStatus(user : Principal, active : Bool) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can toggle user active status");
    };

    switch (userProfiles.get(user)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) {
        let updatedProfile = {
          profile with active = active;
        };
        userProfiles.add(user, updatedProfile);
      };
    };
  };

  public shared ({ caller }) func addProject(project : Project) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add projects");
    };
    if (projects.containsKey(project.id)) {
      Runtime.trap("Project ID already exists");
    };
    projects.add(project.id, project);
  };

  public shared ({ caller }) func updateProject(project : Project) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update projects");
    };
    switch (projects.get(project.id)) {
      case (null) { Runtime.trap("Project not found") };
      case (_) { projects.add(project.id, project) };
    };
  };

  public shared ({ caller }) func deleteProject(id : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete projects");
    };
    projects.remove(id);
  };

  public query ({ caller }) func getAllProjects() : async [Project] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view projects");
    };
    projects.values().toArray();
  };

  public query ({ caller }) func filterProjects(filters : ProjectFilters) : async [Project] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can filter projects");
    };

    let filteredProjects = List.empty<Project>();

    for ((_, project) in projects.entries()) {
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

    filteredProjects.toArray();
  };

  public shared ({ caller }) func addBill(bill : Bill) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add bills");
    };

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

  public shared ({ caller }) func updateBill(bill : Bill) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update bills");
    };

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

  public shared ({ caller }) func deleteBill(projectId : Text, billNumber : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete bills");
    };

    let key = {
      projectId;
      billNumber;
    };
    bills.remove(key);
  };

  public query ({ caller }) func getAllBills() : async [Bill] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view bills");
    };
    bills.values().toArray();
  };

  public query ({ caller }) func filterBills(billFilters : BillFilters) : async [Bill] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can filter bills");
    };

    let filteredBills = List.empty<Bill>();

    for ((_, bill) in bills.entries()) {
      let matchesSearch = switch (billFilters.search) {
        case (null) { true };
        case (?search) {
          let searchLower = search.toLower();
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

    filteredBills.toArray();
  };

  public query ({ caller }) func filterBillsByProject(projectId : Text) : async [Bill] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can filter bills");
    };
    bills.values().toArray().filter(func(bill) { bill.projectId == projectId });
  };

  public query ({ caller }) func getSortedBills(
    sortBy : ?Text,
    ascending : Bool
  ) : async [Bill] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view bills");
    };

    let billsArray = bills.values().toArray();

    let sortedArray = switch (sortBy) {
      case (null) { billsArray };
      case (?sortKey) {
        switch (sortKey) {
          case ("projectName") {
            billsArray.sort(
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
            billsArray.sort(
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
            billsArray.sort(
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
            billsArray.sort(
              func(a, b) {
                let comparison = Nat.compare(
                  a.amount.toInt().toNat(),
                  b.amount.toInt().toNat(),
                );
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
          case (_) { billsArray };
        };
      };
    };

    sortedArray;
  };

  public shared ({ caller }) func bulkDeleteBillsWithPassword(password : Text, billKeys : [BillKey]) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can bulk delete bills");
    };

    if (password != "3554") {
      Runtime.trap("Incorrect password. Bulk delete failed.");
    };

    for (billKey in billKeys.values()) {
      bills.remove(billKey);
    };
  };

  public shared ({ caller }) func addPayment(payment : Payment) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add payments");
    };
    if (payments.containsKey(payment.id)) {
      Runtime.trap("Payment ID already exists");
    };
    payments.add(payment.id, payment);
  };

  public shared ({ caller }) func updatePayment(payment : Payment) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update payments");
    };
    switch (payments.get(payment.id)) {
      case (null) { Runtime.trap("Payment not found") };
      case (_) { payments.add(payment.id, payment) };
    };
  };

  public shared ({ caller }) func deletePayment(id : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete payments");
    };
    payments.remove(id);
  };

  public shared ({ caller }) func bulkDeletePayments(password : Text, ids : [Text]) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can bulk delete payments");
    };
    let storedPassword = "3554";
    if (password != storedPassword) {
      Runtime.trap("Incorrect password. Bulk delete failed.");
    };
    for (id in ids.values()) {
      payments.remove(id);
    };
  };

  public query ({ caller }) func getAllPayments() : async [Payment] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view payments");
    };
    payments.values().toArray();
  };

  public query ({ caller }) func filterPayments(filters : PaymentFilters) : async [Payment] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can filter payments");
    };

    let filteredPayments = List.empty<Payment>();

    for ((_, payment) in payments.entries()) {
      let matchesSearch = switch (filters.search) {
        case (null) { true };
        case (?search) {
          let searchLower = search.toLower();
          let referenceMatches = payment.reference.toLower().contains(#text (searchLower));
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
        case (?reference) {
          Text.equal(payment.reference, reference);
        };
      };

      let matchesMinAmount = switch (filters.minAmount) {
        case (null) { true };
        case (?minAmount) { payment.amount >= minAmount };
      };

      let matchesMaxAmount = switch (filters.maxAmount) {
        case (null) { true };
        case (?maxAmount) { payment.amount <= maxAmount };
      };

      if (matchesSearch and matchesProject and matchesPaymentMode and matchesReference and matchesMinAmount and matchesMaxAmount) {
        filteredPayments.add(payment);
      };
    };

    filteredPayments.toArray();
  };

  public shared ({ caller }) func addClient(client : Client) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add clients");
    };
    if (clients.containsKey(client.id)) {
      Runtime.trap("Client ID already exists");
    };
    clients.add(client.id, client);
  };

  public shared ({ caller }) func updateClient(client : Client) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update clients");
    };
    switch (clients.get(client.id)) {
      case (null) { Runtime.trap("Client not found") };
      case (_) { clients.add(client.id, client) };
    };
  };

  public shared ({ caller }) func deleteClient(id : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete clients");
    };
    clients.remove(id);
  };

  public query ({ caller }) func getAllClients() : async [Client] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view clients");
    };
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
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view analytics");
    };

    let projectsArray = projects.values().toArray();

    let sortedArray = switch (sortBy) {
      case ("outstanding") {
        projectsArray.sort(
          func(a, b) {
            Project.compareByOutstandingAndName(a, b, true, bills, payments);
          }
        );
      };
      case ("name") {
        projectsArray.sort(
          func(a, b) {
            Text.compare(a.name, b.name);
          }
        );
      };
      case (_) { projectsArray };
    };

    sortedArray.map(func(project) { { id = project.id; name = project.name; outstandingAmount = calculateOutstanding(project.id); } });
  };

  // Helper function to calculate outstanding amount for a project
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
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view dashboard metrics");
    };
    let billsTotal = bills.values().toArray().values().foldLeft(0.0, func(total, bill) { total + bill.amount });
    let paymentsTotal = payments.values().toArray().values().foldLeft(0.0, func(total, payment) { total + payment.amount });

    let outstanding = billsTotal - paymentsTotal;

    {
      totalBills = billsTotal;
      totalPayments = paymentsTotal;
      outstanding;
      totalGst = outstanding * 0.18;
    };
  };

  public query ({ caller }) func getOutstandingAmount() : async Float {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view outstanding");
    };
    let billsTotal = bills.values().toArray().values().foldLeft(0.0, func(total, bill) { total + bill.amount });
    let paymentsTotal = payments.values().toArray().values().foldLeft(0.0, func(total, payment) { total + payment.amount });
    billsTotal - paymentsTotal;
  };

  let gstRatePercent : Nat = 18;

  public query ({ caller }) func getTotalGst() : async Float {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view GST");
    };
    let billsTotal = bills.values().toArray().values().foldLeft(0.0, func(total, bill) { total + bill.amount });
    (billsTotal * gstRatePercent.toFloat()) / 100.0;
  };

  let bulkDeletePassword = "3554";

  public shared ({ caller }) func bulkDeleteProjects(password : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can bulk delete projects");
    };
    if (password != bulkDeletePassword) {
      Runtime.trap("Invalid password");
    };
    projects.clear();
  };

  public shared ({ caller }) func bulkDeleteClients(password : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can bulk delete clients");
    };
    if (password != bulkDeletePassword) {
      Runtime.trap("Invalid password");
    };
    clients.clear();
  };

  public shared ({ caller }) func importProjects(projectsData : [Project]) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can import projects");
    };

    for (project in projectsData.values()) {
      projects.add(project.id, project);
    };
  };

  public shared ({ caller }) func importBills(billsData : [Bill]) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can import bills");
    };

    for (bill in billsData.values()) {
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
  };

  public shared ({ caller }) func importPayments(paymentsData : [Payment]) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can import payments");
    };

    for (payment in paymentsData.values()) {
      payments.add(payment.id, payment);
    };
  };

  public shared ({ caller }) func importClients(clientsData : [Client]) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can import clients");
    };

    for (client in clientsData.values()) {
      clients.add(client.id, client);
    };
  };

  public shared ({ caller }) func importUsers(usersData : [(Principal, UserProfile)]) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can import users");
    };

    for ((principal, userProfile) in usersData.values()) {
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
        AccessControl.assignRole(accessControlState, caller, principal, userProfile.role);
      };
    };
  };

  public shared ({ caller }) func importActiveUsers(userProfilesData : [(Principal, UserProfile)]) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can import users");
    };

    var inactiveProfileCount = 0;
    for ((_, profile) in userProfilesData.values()) {
      if (not profile.active) {
        inactiveProfileCount += 1;
      };
    };

    if (inactiveProfileCount > 0) {
      Runtime.trap("At least 1 user profile was imported as inactive. Please activate manually to allow access.");
    };

    for ((principal, userProfile) in userProfilesData.values()) {
      userProfiles.add(principal, userProfile);
      AccessControl.assignRole(accessControlState, caller, principal, userProfile.role);
    };
  };

  public query ({ caller }) func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public query ({ caller }) func getGreetingMessage(_ : ()) : async Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can access Seri AI");
    };

    switch (userProfiles.get(caller)) {
      case (null) { "Hello 👋\n\nI'm Seri AI 👋\nI can help you with Projects, Bills, Payments, Outstanding, GST, Reports, and Analytics.\nWhat would you like to know?" };
      case (?profile) {
        let currentTimeMillis = Time.now();
        let istTimeMillis = (currentTimeMillis + (5 * 3600000000000) + (30 * 60000000000)) % (24 * 3600000000000);
        if (istTimeMillis >= (5 * 3600000000000) and istTimeMillis < (12 * 3600000000000)) {
          return "Good Morning, " # profile.fullName # " ☀️\n\nI'm Seri AI 👋\nI can help you with Projects, Bills, Payments, Outstanding, GST, Reports, and Analytics.\nWhat would you like to know?";
        } else if (istTimeMillis >= (12 * 3600000000000) and istTimeMillis < (17 * 3600000000000)) {
          return "Good Afternoon, " # profile.fullName # " 🌤️\n\nI'm Seri AI 👋\nI can help you with Projects, Bills, Payments, Outstanding, GST, Reports, and Analytics.\nWhat would you like to know?";
        } else if (istTimeMillis >= (17 * 3600000000000) and istTimeMillis < (22 * 3600000000000)) {
          return "Good Evening, " # profile.fullName # " 🌆\n\nI'm Seri AI 👋\nI can help you with Projects, Bills, Payments, Outstanding, GST, Reports, and Analytics.\nWhat would you like to know?";
        } else {
          return "Good Night, " # profile.fullName # " 🌙\n\nI'm Seri AI 👋\nI can help you with Projects, Bills, Payments, Outstanding, GST, Reports, and Analytics.\nWhat would you like to know?";
        };
      };
    };
  };

  public query ({ caller }) func getAllProjectNames() : async [Text] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view project names");
    };
    projects.values().toArray().map(func(p) { p.name });
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
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can access Seri AI");
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
};
